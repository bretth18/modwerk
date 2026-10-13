# SPDX-License-Identifier: GPL-3.0-or-later
"""Private developer artifacts using POSIX modes or actual Windows DACLs.

Windows chmod bits do not establish privacy. Native .NET access-control APIs
avoid depending on whichever PowerShell cmdlet modules the caller imported. New directories receive a
protected current-user-only inheritable DACL through ordinary owner access;
existing directories are inspected without changing their permissions.
"""
import json
import os
import re
from pathlib import Path
import stat
import subprocess

WINDOWS = os.name == 'nt'
FULL_CONTROL = 0x1f01ff
# Cold native Windows CI exceeded 15 seconds before PowerShell produced any
# ACL error. Keep one bounded attempt, including startup and .NET loading.
WINDOWS_ACL_TIMEOUT_SECONDS = 60
ACL_SCRIPT = r'''
$ErrorActionPreference = 'Stop'
$stage = 'identity'
try {
$path = $env:MODWERK_RUNTIME_PRIVATE_PATH
$sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
$stage = 'item'
$attributes = [IO.File]::GetAttributes($path)
$isDirectory = ($attributes -band [IO.FileAttributes]::Directory) -ne 0
if (($attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Reparse output refused' }
if ($env:MODWERK_RUNTIME_PRIVATE_ACTION -eq 'protect') {
    $stage = 'create-rule'
    if ($isDirectory) {
        $acl = New-Object System.Security.AccessControl.DirectorySecurity
        $inheritance = 'ContainerInherit,ObjectInherit'
    } else {
        $acl = New-Object System.Security.AccessControl.FileSecurity
        $inheritance = 'None'
    }
    $acl.SetOwner($sid)
    $acl.SetAccessRuleProtection($true, $false)
    $rule = [System.Security.AccessControl.FileSystemAccessRule]::new(
        $sid, [System.Security.AccessControl.FileSystemRights]::FullControl,
        [System.Security.AccessControl.InheritanceFlags]$inheritance,
        [System.Security.AccessControl.PropagationFlags]::None, [System.Security.AccessControl.AccessControlType]::Allow)
    $acl.AddAccessRule($rule)
    $stage = 'apply'
    if ($isDirectory) { [IO.Directory]::SetAccessControl($path, $acl) }
    else { [IO.File]::SetAccessControl($path, $acl) }
}
$stage = 'inspect'
if ($isDirectory) { $acl = [IO.Directory]::GetAccessControl($path) }
else { $acl = [IO.File]::GetAccessControl($path) }
$rules = @($acl.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier]) | ForEach-Object {
    @{ sid = $_.IdentityReference.Value; kind = $_.AccessControlType.ToString(); rights = [int]$_.FileSystemRights;
       inheritance = [int]$_.InheritanceFlags; propagation = [int]$_.PropagationFlags }
})
@{ owner = $acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value; user = $sid.Value;
   protected = $acl.AreAccessRulesProtected; directory = [bool]$isDirectory; rules = $rules } | ConvertTo-Json -Compress -Depth 4
} catch {
    [Console]::Error.WriteLine('PRIVATE_ACL:' + $stage + ':' + $_.Exception.GetType().FullName)
    exit 1
}
'''


def windows_acl(path, protect=False):
    """Read the native DACL; no elevation, shell expansion or caller code."""
    executable = Path(os.environ.get('SystemRoot', 'C:/Windows')) / 'System32/WindowsPowerShell/v1.0/powershell.exe'
    env = {**os.environ, 'MODWERK_RUNTIME_PRIVATE_PATH': str(path),
           'MODWERK_RUNTIME_PRIVATE_ACTION': 'protect' if protect else 'inspect'}
    try:
        result = subprocess.run([str(executable), '-NoLogo', '-NoProfile', '-NonInteractive', '-Command', ACL_SCRIPT],
                                env=env, capture_output=True, text=True, timeout=WINDOWS_ACL_TIMEOUT_SECONDS, check=True)
        if len(result.stdout) > 16384:
            raise ValueError('Unbounded ACL response')
        value = json.loads(result.stdout)
    except (OSError, subprocess.SubprocessError, ValueError) as error:
        # Never expose native error text, commands, private paths or causes.
        if isinstance(error, subprocess.TimeoutExpired):
            raise ValueError('Windows private-output DACL verification timed out after 60 seconds.') from None
        detail = ''
        if isinstance(error, subprocess.CalledProcessError) and isinstance(error.stderr, str):
            safe = re.fullmatch(r'PRIVATE_ACL:(identity|item|create-rule|apply|inspect):([A-Za-z][A-Za-z0-9_.]{0,127})\s*', error.stderr)
            if safe:
                detail = f' ({safe[1]}: {safe[2]})'
        raise ValueError('Cannot establish or inspect the Windows private-output DACL.' + detail) from None
    if not isinstance(value, dict):
        raise ValueError('Invalid Windows private-output DACL response.')
    return value


def check_windows_acl(value, directory, protected=True):
    user, rules = value.get('user'), value.get('rules')
    if (not isinstance(user, str) or not user.startswith('S-1-') or value.get('owner') != user
            or value.get('directory') is not directory or not isinstance(rules, list) or not rules
            or protected and value.get('protected') is not True):
        raise ValueError('Use a current-user-owned private Windows output directory.')
    rights = 0
    for rule in rules:
        if (not isinstance(rule, dict) or rule.get('sid') != user or rule.get('kind') != 'Allow'
                or type(rule.get('rights')) is not int or rule.get('propagation') != 0
                or rule.get('inheritance') != (3 if directory else 0)):
            raise ValueError('Windows private output permits another principal or denies access.')
        rights |= rule['rights']
    if rights & FULL_CONTROL != FULL_CONTROL:
        raise ValueError('Windows private output must grant its owner full control.')


def private_directory(path):
    path = Path(path).expanduser().absolute()
    if path.is_symlink() or path.exists() and getattr(path.lstat(), 'st_file_attributes', 0) & 0x400:
        raise ValueError('Private output cannot be a symlink or directory junction.')
    path = path.resolve()
    ancestor = path
    while not ancestor.exists():
        ancestor = ancestor.parent
    if subprocess.run(['git', '-C', str(ancestor), 'rev-parse', '--show-toplevel'], capture_output=True).returncode == 0:
        raise ValueError('Runtime preparation artifacts must stay outside Git worktrees.')
    created = not path.exists()
    path.mkdir(mode=0o700, parents=True, exist_ok=True)
    if WINDOWS:
        check_windows_acl(windows_acl(path, protect=created), directory=True)
    elif not stat.S_ISDIR(path.stat().st_mode) or path.stat().st_mode & 0o077:
        raise ValueError('Use a private output directory (0700).')
    return path


def save(path, data):
    # Exclusive creation also refuses existing symlinks and source files.
    path = Path(path)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        if WINDOWS:
            check_windows_acl(windows_acl(path.parent), directory=True, protected=False)
            check_windows_acl(windows_acl(path, protect=True), directory=False)
    except BaseException:
        os.close(fd)
        path.unlink()  # our new empty file only; no artifact bytes were written
        raise
    with os.fdopen(fd, 'wb') as output:
        output.write(data if isinstance(data, bytes) else (json.dumps(data, indent=2) + '\n').encode())
