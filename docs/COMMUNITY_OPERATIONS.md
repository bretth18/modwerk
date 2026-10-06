# Community operations

These procedures accompany the forum draft. They do not authorize a production deployment, restore, data deletion or provider-plan change. Use Node 24 and the reviewed dependency lockfile. Keep operational evidence and private identifiers outside Git, screenshots and public PR descriptions.

See [LEGAL_COMPLIANCE.md](LEGAL_COMPLIANCE.md) for German/EU disclosures, provider/transfer/retention review, rights deadlines and notice-and-action operations. `PRIVACY_READY=true` is an additional server-side registration prerequisite. Include migration 0018 in the approved rollout.

## Opening and pausing registrations

Both Wrangler configurations default `REGISTRATION_OPEN` and `PRIVACY_READY` to `false`. The server rejects new registrations unless both flags are exactly `true`; hiding the frontend form is not the control. Closing registration keeps existing sign-in, verification, recovery and moderation available. The session endpoint reports mail availability separately from registration availability.

Deploy the reviewed backend and apply migrations 0011–0019 only after owner authorization. Keep registration closed while checking health, existing content, administrator access and the frontend/API origin. Open it only after the controlled runtime and real-mail tests in [FORUM_LAUNCH.md](FORUM_LAUNCH.md) pass and the owner approves public launch. An operator can pause signups by deploying the reviewed configuration with registration closed. Do not improvise changes to hashing parameters or provider billing to solve capacity problems.

## Backups and recovery

D1 [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/) is always on for production-storage databases: the documented recovery window is seven days on Workers Free and 30 days on Workers Paid. Verify the actual account plan and database storage version. Record the current bookmark privately immediately before any migration. Time Travel restores overwrite the database and cancel in-flight queries; obtain specific owner approval before using them.

The backup helper writes an authenticated AES-256-GCM archive. Its restore command supports only a fresh local directory. The local exporter uses the pinned Wrangler/Miniflare D1 exporter with explicit persistence because `wrangler d1 export` does not accept `--persist-to`.

Create a private key once, without printing it:

```sh
mkdir -p .wrangler/private-backups
chmod 700 .wrangler/private-backups
node --input-type=module -e "import {randomBytes} from 'node:crypto'; import {writeFileSync} from 'node:fs'; writeFileSync('.wrangler/private-backups/backup-key',randomBytes(32).toString('hex'),{mode:0o600,flag:'wx'})"
```

Test with fictional local data first:

```sh
node scripts/community-backup.mjs backup --config wrangler.worker.jsonc --database octamod-community --local --persist-to .wrangler/forum-preview --archive .wrangler/private-backups/local-check.octamod --key-file .wrangler/private-backups/backup-key
node scripts/community-backup.mjs restore-local --config wrangler.worker.jsonc --database octamod-community --local --persist-to .wrangler/restore-check --archive .wrangler/private-backups/local-check.octamod --key-file .wrangler/private-backups/backup-key
```

After production access is authorized, take an encrypted remote export:

```sh
node scripts/community-backup.mjs backup --config wrangler.worker.jsonc --database octamod-community --remote --archive .wrangler/private-backups/prelaunch.octamod --key-file .wrangler/private-backups/backup-key
```

The helper withholds provider output and removes its private temporary plaintext SQL in `finally`. Exported SQL still exists briefly on the operator's disk; use a trusted encrypted device. Dumps over 256 MiB need a separately reviewed streaming procedure. Never put archives, key files or restored private databases in Git. Store an encrypted archive off-device and the recovery key in separate restricted storage; encryption is ineffective if archive and key are stolen together. Restore only on a trusted local device, compare schema/table counts, run integrity and foreign-key checks, and record metadata rather than rows. An archive is not a verified recovery point until its restore is checked.

Before launch, assign a backup operator and confirm the off-device destination, access and retention. Recommended operating cadence: daily encrypted exports, before each migration, and a recovery drill after schema changes. This document does not create a scheduler or external storage account. Confirm the archive rotation period explicitly; the application does not automatically rotate backup files. A recovery must reapply any approved removal records made after the restore point before reopening the service, to avoid restoring erased personal data.

## Private account-removal requests

Members submit a private request from Your account using their current password and a confirmation. Requests can be withdrawn while pending; duplicate active requests are merged. The Accounts tab in the administrator workspace lists the private queue. A visitor/member session cannot access it. The review note should record approval references and actions, without passwords, email addresses, action links or unnecessary personal details.

Submission and review never delete data. There is no automatic deletion endpoint. For each request:

1. Verify control of the account and confirm the exact scope with the member through an approved private support channel. Choose and record how public discussion, comments, attribution, configuration snapshots, reactions and any externally published GitHub issues will be handled. Assess the Article 17 grounds and any lawful exception for retaining contributions; do not condition statutory erasure on additional consent. Clarify scope when necessary without automatically resetting the response deadline.
2. Prepare a reviewed transaction and a recovery point for that exact account ID. Require separate authorization for the destructive operator action. Prefer suspension/session revocation before the approved removal to prevent concurrent writes.
3. Remove private authentication records and action tokens, private reports including their device logs/replies, developer sessions/handoff codes, maintainer claims and developer audit rows, saved configurations, follows/bookmarks/notifications, announcement read markers (`announcement_reads`) and moderation reports as approved. Mark the member's forum images and sound clips removed (`UPDATE forum_media SET removed=1 WHERE user_id=?`) and let the hourly job purge them from the R2 bucket; the removal check waits until no `forum_media` rows remain. Address user references in submissions/media and review/moderation history as applicable. Inventory the current schema rather than relying on an outdated table list.
4. Apply the approved public-content handling and retain an inert `users` projection when needed for discussion/attribution foreign keys: no username or GitHub identity/handle, unverified, suspended, display name `Deleted member`. Do not grant the old identity to a new account. Preserve other contributors' posts and source attribution as agreed. Provider logs, existing public GitHub issues and recovery archives need separate handling; database changes cannot erase those copies.
5. Verify the original credentials and sessions fail, private APIs cannot recover the removed data, other members still work, references are valid and retained content matches the approved scope. Only then mark the request complete and record a minimal private audit note.

The server rejects completion while authentication, account tokens, legacy/developer sessions and codes, claims/replies/developer events, rules acceptance and news preferences, private reports/configurations, follows/bookmarks/notifications/announcement read markers/reports or the active user projection remain. This is a minimum technical check; it cannot inspect provider logs, archives, public free text or externally published copies. The operator must verify those separately.

The owner chose `jannik.assfalg@gmail.com` as the public receiving support contact on 3 October 2026. Sign-in, privacy and account-removal pages link to it, and transactional email sets it as Reply-To. `accounts@modwerk.app` is the sending identity from launch; it is not presented as a receiving mailbox. Confirm support-message receipt and the response procedure before public launch. Never ask a member to email passwords, recovery links or firmware.

## Retention and private records

Current implemented retention is deliberately stated in public privacy copy:

| Data | Current behavior |
| --- | --- |
| Verification / recovery links | Expire after 24 hours / 30 minutes; one use |
| Member / developer / administrator sessions | Up to seven days / seven days / eight hours; revocable |
| GitHub OAuth state / browser handoff | Up to ten minutes / 60 seconds; one use |
| Expired sessions, action tokens and rate-limit buckets | Removed by the hourly Worker cleanup |
| Aggregate site usage | Existing 90-day daily retention |
| Accounts and unverified registrations | Retained until operator removal |
| Forum posts, configurations, reports, notifications and review history | Retained until operator removal; no automatic deletion schedule |
| Forum images and sound clips | Kept while attached to a post; removed files and uploads unused after a day are deleted from R2 by the hourly Worker cleanup |
| Aggregate mail counters | Retained; admin response shows at most 60 day/purpose rows |
| Resend logs / Cloudflare recovery history | Provider retention and account settings; verify in the provider dashboards |
| Encrypted export archives | Operator-controlled; no automatic rotation |

Before public launch, approve the public privacy/support details and document the chosen archive/provider retention. Define any shorter account/report/notification retention explicitly before adding irreversible cleanup; do not silently delete pending reports or retained attribution. Public free text can contain personal information despite guidance, so moderation/removal procedures apply to it too.

## Mail failures, moderation and incidents

Account acceptance responses are intentionally generic, including provider failure and exhausted global sending quotas, to avoid disclosing account membership. They are not delivery receipts. The private Accounts tab counts provider-accepted, failed and limited attempts by UTC day and purpose; it never stores recipients, action links, response bodies or message IDs. Provider acceptance does not prove inbox delivery. Investigate a failure count or support report in Resend, checking bounce/suppression/TLS failures and actual delivery. Do not copy message bodies or recipient addresses into application logs or public issues.

The sender has a ten-second request timeout and an idempotency key derived from the action token. Failed attempts consume quota. There is no automatic retry loop: members can request a fresh verification/recovery message within per-address/IP/global limits. A verification resend creates a new complete action token even within the same second and replaces the previous one. Recovery revokes other sessions and outstanding action links. Account verification, recovery and new-member welcomes share the 80/day budget. Activity digests are described in FORUM.md; further news uses the separate opt-in.

During the initial launch period, the assigned operator should review the private forum reports/account requests and mail counters daily and check Cloudflare request errors, CPU limits and D1 failures after releases. Use provider aggregate metrics; do not enable request-body, credential, action-link or address logging. Alerts/scheduled checks are not configured by this draft. Record the operator and escalation route before opening registration.

Forum reports, hiding, locking, suspending and private moderation history are available behind separate administrator authorization. For spam, suspend the offending account and hide the affected content with a concise private reason. Suspension revokes member, legacy and developer sessions plus pending developer handoffs. Do not publish private reports or device logs as part of moderation.

For suspected credential compromise, pause registrations and affected writes through an approved deployment, capture minimal aggregate evidence, rotate the affected Worker secrets and revoke compromised sessions/action tokens. Rotating `AUTH_SECRET` alone does not replace the need to review stored sessions and action tokens. Administrator key rotation invalidates administrator sessions. Revoke/replace a compromised Resend key using domain-restricted sending-only permissions. Recover from the last verified database/Worker version with owner approval, preserve approved removal records, and test access boundaries before reopening. Keep security advisories reviewed and dependencies pinned; ordinary application checks never run firmware/DSP tests.

Developer OAuth setup and report-consent boundaries are documented in [DEVELOPER_WORKSPACE.md](DEVELOPER_WORKSPACE.md). Rotating the GitHub OAuth client secret invalidates developer sessions; claims are retained for independent revocation/review. GitHub-only identities use the support contact for removal requests rather than a password-based member request.

## Administrator role

A verified, unsuspended member whose `users.is_admin` is `1` sees the Admin workspace and passes every `/api/admin/*` check; nobody else sees it, and the page tells other visitors it is for administrators only. The role cannot be set through the API. The owner grants or removes it directly in D1 (`UPDATE users SET is_admin=1 WHERE username='…'`). Migration 0022 adds the column and must be applied **before** the Worker that reads it is deployed. The separate administrator key (`ADMIN_KEY_SHA256`, `POST /api/auth/admin`) still works for API access as break-glass access, but the website no longer offers a key form.

## Member statistics

The Statistics and Accounts tabs of the Admin workspace show aggregate account numbers from `GET /api/admin/accounts?days=7|30|90` (default 30): members, unverified and unfinished social sign-ups, suspended and deleted accounts, administrators, news opt-ins, sign-ins by method and daily sign-ups for the chosen UTC period. They are computed from the account tables on request, so they need no opt-in and cover every sign-up since launch. Removed accounts drop out of the history. No email address, provider profile or per-member row is returned.

The Members section also reads sign-ups against the rest of the site, using the same completed-day rules as the usage dashboard (today is excluded; the previous period is the equally long window just before):

- **Sign-up rate** divides the period's sign-ups by the estimated daily visitors of the same days from `usage_daily`, shown as sign-ups per 100 daily visitors. Days before usage collection began, and the partial first collection day, are left out of both numerator and denominator; the previous period's rate needs its whole window collected and retained. Daily visitors are rotating identifiers and exclude objecting or Do Not Track browsers, so this approximates sign-ups per visit, not per person.
- **Completed sign-ups** is the share of the period's sign-ups whose email is verified and whose social onboarding has finished. Recent days read lower while verification is pending.
- **Active members** counts members who used a sign-in session within the last 7 days (sessions expire after 7 days, so no longer window is derived from them), plus members who wrote a visible forum post in the last 30 days.
- The daily chart switches between sign-ups, completed sign-ups and the sign-up rate; uncollected days are drawn as gaps, not zeros.

Usage counts (visitors, page views, builds, downloads) come from separate paths; see Usage counts below.

## Usage counts

Two independent paths feed the Statistics tab. `POST /api/usage/count` takes only a closed event name (or `module_download` with one public module ID), needs no consent header and stores nothing on the device. It estimates daily unique visitors from an HMAC of IP address and User-Agent, keyed with the backend secret and a random per-day salt (`usage_meta` key `visitor-salt:<day>`); the digest goes to `usage_visitors`, which the hourly cleanup empties after the previous day, and the salt is deleted after its day, so visitors cannot be linked across days. It is on for every visitor unless the browser sends Do Not Track or Global Privacy Control, or the visitor objects on the privacy page. Abuse limiting uses a separate daily-rotated HMAC of the client IP (300 counts per hour) that expires with the rate-limit row. The opt-in path (`/api/usage/events`, `/api/usage/module-downloads`) is unchanged and counts its browsers by their own daily identifier. Totals without consent start 2026-10-05 and visitor estimates on the deploy day of this change; days between the 2026-10-04 opt-in change and those dates cannot be reconstructed.


## Announcements to every member

An announcement is one line in the notification bell of every verified member who joined before it was sent, with a title, a message of up to 400 characters and an optional link. It is never mailed and creates no activity notification, so the digests, the daily mail cap and members' email settings do not apply to it.

Merging applies migration 0031 ahead of the Worker deploy, as for every migration; it only adds the `announcements` and `announcement_reads` tables, which the previous Worker ignores. Send from **Admin workspace → Announcements** (administrator session or administrator member account). The key must be new: sending the same key twice is refused, so a double click cannot announce twice. The link may be an app address (`#module/...`) or a `https://modwerk.app/` address; naming a module opens its page. An announcement cannot be edited. **Remove** takes it out of every bell and deletes its read markers. The list shows how many members have read each one.

The hourly release inventory check also announces newly added modules automatically, using the live site’s name and module link. The first inventory only establishes a baseline, so deployment does not announce the historical library. A stable key per module prevents duplicate announcements on retries or reintroduction; ordinary version updates continue to notify followers. Automatic announcements use the same bell, private read state and admin removal controls as operator announcements, and are never mailed.

`announcement_reads` holds only member IDs, announcement IDs and read times. It is included in the self-service data export and listed in the removal checklist above; the announcements themselves contain no personal data. They are retained until removed.

## New-member welcome operation

Apply migration 0029 before enabling the updated Worker. Existing completed members are excluded so the earlier first-news recipients are not mailed twice; incomplete signups become eligible on completion. The separate five-minute trigger sends each new verified member one welcome regardless of their news choice. Set `WELCOME_MAIL_ENABLED=false` to pause it without affecting signup or account access.

The `member_welcome_mail` table contains account IDs, template versions, delivery state and timestamps, never email addresses or message content. It is deleted through the account foreign key and included in self-service data export. Use aggregate `SELECT state,COUNT(*) FROM member_welcome_mail GROUP BY state` for operational checks. The `welcome` purpose in account mail counters reports provider acceptance, failure and quota limits. Rows in `review` need provider-side delivery verification before an operator retries; automatic uncertain retries stop before Resend expires their duplicate protection.

Apply migration 0030 before deploying a welcome content update. Each queued member keeps their template version and matching provider idempotency key, so already attempted messages retry with exactly the original content. New members receive the current template, including the Discord invitation. Keep older template payloads unchanged while they may still be retried. The invitation added on 5 October expires on 28 October 2026; replace it with a permanent invite for later welcomes.

## Members online

Apply migration 0040 before deploying the Worker that reads it. While a verified member has the site open in a visible tab, the bell's one-minute unread poll overwrites one `member_presence` row with the time (written at most every two minutes). The sidebar's public `GET /api/community/online` returns only the number of members seen in the last five minutes, and the admin Members statistics read online, today, 7-day and 30-day counts from the same rows. `member_activity_daily` keeps one aggregate count of distinct members per UTC day for the activity chart, with no member IDs.

Guests and background tabs are never counted. The hourly cleanup removes presence rows 31 days after the last visit; the daily counts name no one and are kept, starting with the deployment day that the migration seeds. Account deletion removes the row; it is in the removal checklist and the self-service data export (`lastSeen`).
