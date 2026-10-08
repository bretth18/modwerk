# Publishing updates as a module author

The owner approves a module's first release by reviewing and merging its addition. After that, its registered author can request automatic merge and publication of their own updates. Open a pull request against `repeat98/modwerk` `main`; pushing to a personal upstream repository does not submit an update to Modwerk. New modules, ownership changes, shared SDK/compiler changes and release exceptions still need owner review.

## Start with an issue

In your fork, tell your coding agent:

```text
Fix issue https://github.com/repeat98/modwerk/issues/<number>
```

`AGENTS.md` tells it to read the issue, prepare the fix, update the version and release notes, and guide the hardware checks for your exact build. The Developer workspace and GitHub-linked report pages have a **Copy fix prompt** button. The agent must ask for actual hardware results when they are missing; it cannot perform those tests or invent a pass. Tell it what happened, including failures, and it can continue preparing the release when all required results pass. The two PR checkboxes require your own evidence verification.

Pushing Git commits does **not** increment a module version. Your agent changes the semantic version explicitly: a compatible bug fix normally increments the patch number (for example `0.1.0-experimental` to `0.1.1-experimental`). Keep the exact version in its manifest, catalog and release notes synchronized. Pushing to a fork or another upstream alone does **not** update Modwerk's frontend.

| Step | What is ready | Issue status |
| --- | --- | --- |
| Fix and private tests | Local build; website still serves the current release | Open |
| Push and open opted-in PR | New code and version await checks | Open |
| Checks pass and author workflow merges | Publication starts | Open |
| Site deployment succeeds | New frontend/catalog available; verify the version and a saved compatible firmware download | Open until verified |
| Live version and download verified | Fix released; link the version and module/release | Resolve the issue |

Follow **Module PR checks**, then **Publish module author updates**, then the site's deployment and community Worker workflows in GitHub Actions. A green PR or merged badge alone does not establish a live frontend. If any required stage fails, keep the issue open and the previous published release available. Use `Related to #<number>` in the PR instead of merge-time closing keywords. After verifying the live fix on the unit, finish the release from the report in the Developer workspace: confirm the published download and choose **Resolve report and notify followers**. This requires the registered numeric GitHub identity and current, unrevoked access to that module and the reporter's existing maintainer sharing. The service verifies the exact module version in the live inventory, posts the public version/module link on the mirrored GitHub issue, closes it as completed, synchronizes the Modwerk report, and queues update and reporter-resolution notifications. No repository-wide GitHub write access is needed. A missing live version, unregistered account identity, withdrawn sharing or failed GitHub closure keeps the report open. Retries reuse the notification keys and release comment.

The coding agent should carry out this completion step through the author's authenticated Developer workspace after actual download verification. `POST /api/developer/modules/<community-id>/releases/complete` accepts `{ "version": "<published-version>", "issues": ["<shared-report-id>"], "verifiedDownload": true }`, with at most 25 reports from the same module. It checks current claimed ownership on the server; a supplied login or another module/report never grants access. An empty report list can queue just the module's update notifications. Direct GitHub issues without a shared Modwerk report still require authorized GitHub closure; identify any missing access instead of claiming completion.

Existing followers and eligible prior downloaders receive the normal per-version updates unless they opted out. Completion returns the actual stored notification count for this module/version. Push starts through the existing request/cron dispatcher. Email uses the existing digest schedule, settling delay and provider quota, including muted topics and opted-out mail. The hourly inventory sync remains a retry fallback. Do not create a second scheduler or blast, override preferences, or claim all recipients received a message from a queued count. Report the queue count and any actual delivery delay or failure.

## Prepare the release

1. Rebase your fork onto current `main`. Edit your module under `sdk/<machine>/modules/<id>/` and keep its original authors and licences. For automatic publication, increase its semantic version and update its catalog entry and release notes, including for documentation-only updates.
2. Follow [the module workflow](MODULE_ADDITION_WORKFLOW.md) and [qualification requirements](MODULE_QUALIFICATION.md). Runtime changes need current source/build evidence and native/browser parity. Exercise multiple instances with different settings across tracks, FX slots and DSP cores where supported; check instance isolation, Part save/reload, project save/load/reload, and a restart retaining only battery RAM and the saved card. Record physical reboot reports separately from emulator evidence. An explicit project load after fresh boot does not prove reboot survival. Failed or untested required acceptance checks need owner review and cannot use automatic publication. Editorial updates may retain approved evidence through the existing checked path.
3. Regenerate the catalog, rebuild changed Octatrack packages with the reviewed isolated toolchain, and commit the source, documentation, evidence, media and stock-free packages together. For Digitakt/Digitone runtime updates, include each approved OS variant of your own `vendor/elekloader/catalog/*.elemod`, update the matching catalog rows to the new version, and update the catalog hash/revision in `vendor/elekloader/elekloader.lock.json`. Pin each package to the exact module source commit in the already approved GitHub repository (no floating release tag), retain its stock target, author and licence, and verify source/native/browser parity for that released package. Kit code, cores, dependencies and other modules stay fixed. Source or version changes without matching shipped packages cannot publish automatically. Keep firmware, projects/cards and raw dumps local. Run `npm run check -- --base origin/main`.
4. Open your PR and check both boxes below only after personally reviewing the actual evidence:

   - [ ] Automatically merge and publish my module update after checks pass.
   - [ ] I verified the source, licences, UI and qualification reports, including instance isolation and Part/project/reboot persistence where applicable; no required acceptance check is failed or untested.

The workflow verifies your numeric GitHub account ID against `.github/module-authors.json` on the original base commit, then checks authorship or maintainership in the original published manifest. It grants no repository-wide write permission or site administration. A PR cannot change its own ownership, licences, effect ID, the author registry, common build/runtime code, workflows, other modules or their compiled packages. New import records can describe only the author's modules; published release notes stay intact. Octatrack generated packages must reproduce the fixed compiler's output in CI. Digitakt/Digitone source is compiled twice in isolation; their separately shipped `.elemod` packages retain their approved stock targets and must pass catalog/lock/hash validation and the author's actual parity/qualification verification. Changes outside that scope remain ordinary PRs for owner review.

`Module PR checks` must succeed on this exact head and base. A trusted CI job name records both hashes, so fork PRs work even when GitHub omits their workflow-run PR association. Required compilation jobs cannot be skipped. A new push, rerun or change to main invalidates the earlier check; rebase and rerun it. GitHub's branch protections remain enforced by the merge API. The automation does not bypass reviews required by a repository ruleset.

The privileged `Publish module author updates` workflow checks out only trusted `main`. It reads the PR as Git objects and GitHub metadata. It installs no PR dependencies, executes no PR code, restores no PR cache and consumes no build artifact. The merge is made by `github-actions[bot]` with the expected head SHA, and its two parents must match the checked base and head. If main changes during the merge, publication stops and owner review is required.

The publisher independently checks the bot's merge event, both merge parents, the original ownership/registry, current successful CI and exact change scope. Merely merging with another account or inserting approval in a package is insufficient. Compilation, version, licence, documentation, qualification and package reproduction gates remain in place. A failed release keeps the previous published release available.

Because `GITHUB_TOKEN` merges do not trigger push workflows, the author workflow explicitly dispatches both site and community API publication. Dispatch failure is visible in the author workflow; rerun the site's and Worker's normal workflows on main to retry publication. Successful merge alone is not confirmation that deployment finished.

## Repository setup

This implementation needs no new personal access token, repository-wide collaborator invitation or secret. Keep `MODULE_APPROVER_GITHUB_ID` configured for ordinary owner-reviewed releases. The author workflow uses its job-scoped `GITHUB_TOKEN` with contents, pull requests and Actions write permissions. Enable repository Actions permissions if organization policy disables them; forks may still need GitHub's first-contributor workflow approval.

If main requires an approving review for every PR, GitHub will block automatic author merges until that rule is adjusted. Keep required `module-contract` and relevant source-build checks and require branches to be up to date; do not give the bot a general bypass of branch protections. The scope policy supplies owner review for changes beyond authors' own modules. Review repository-wide consequences before changing a ruleset.

All current published primary authors are registered with numeric IDs from their public GitHub repository owner records. On the first owner-reviewed addition by a new author, register that account ID in the same PR. Handle renames, maintainer appointments and revocations also need owner review of the registry/manifests. Website module claims and developer sign-in do not change this release authority.
