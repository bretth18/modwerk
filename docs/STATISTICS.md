# Site statistics and module popularity

The Statistics tab is the first tab and default view in `#admin`. It reports visits and use of the local configurator, module engagement and current moderation workload. All private reads require the existing server-verified administrator session; the public collector has no read endpoint. Guest participation stays account-free. No credentials, real visitor records or real usage counts belong in the public repository.

## Definitions and coverage

| Measure | Trigger | Limit |
| --- | --- | --- |
| Visitors today | Distinct random browser identifiers received during one UTC day | Identifiers rotate daily; this is not a count of people or period-wide unique visitors. Any supported event establishes a visit. |
| Page views | Initial visit or navigation to a different public app view | Admin views are excluded. The route, URL and referrer are not sent. |
| Configurations started | First module added to an empty configuration, or a nonempty import/duplicate | Empty automatic configurations do not count. Configuration IDs are deduplicated on the device and never sent. |
| Successful builds | Completed local builds that still belong to the current operation | Failed, rejected and cancelled builds do not count. |
| Firmware download requests | Click on an enabled firmware download button | Does not prove that the file was saved or flashed. |
| Configuration exports | Configuration backup download requested | Contents and file names are not sent. |

The dashboard offers 7, 30 and 90 UTC-day periods, a selectable daily chart for every usage metric, an accessible daily table and CSV export. Chart bars support clicks and arrow/Home/End keys with one tab stop; exact selected values appear below the chart. Collection begins with the first accepted event after deployment. Earlier traffic is unavailable and appears as a dash, not an invented zero. Today and the collection start day are partial. Offline use, blocked requests, privacy preferences, device resets and automated traffic affect coverage; these counts are not billing or audit evidence.

Selected-period event totals include today. Percentage changes compare the completed portion of the selected period (6 or 29 days) with an equally long immediately preceding window. The first collection day is excluded conservatively, and comparisons require both full windows to be within collected, retained history. There is no 90-day comparison because its preceding window exceeds the existing 90-day retention. A zero previous total shows an absolute increase rather than an infinite percentage. Averages, busiest days and days with visitors use fully collected completed days, including covered zero-activity days. Daily visitors are not summed into period-wide unique visitors. Aggregate events are not a linked conversion funnel.

CSV contains only daily aggregate values, UTC dates and `uncollected`, `partial` or `complete` coverage. Uncollected metric fields are blank; a recorded zero stays zero. It contains no visitor identifiers, module/configuration grouping or private report content.

## Community insights and moderation

`GET /api/admin/insights` returns current counts, open issue age buckets and per-module/set aggregate engagement. It uses the same server-side administrator check and `Cache-Control: no-store` as other private reads. No report body, comment body, reporter identity, guest ID or session material enters this response. Each data source is grouped before joining to prevent multiplication of independent ratings, comments and issues. Withdrawn modules with retained activity remain visible as history.

Module download requests are cumulative from their own collection boundary; likes, ratings, retained comments and open issues are current totals. These are independent of the usage period selector. Rating averages display their sample size; unrated modules remain labelled unrated. Ranking supports downloads, likes, ratings, comments and issues, plus title/ID search. Module download totals cannot be added together to infer firmware download requests.

Community health shows open/resolved issues, reports waiting at least seven days, current comments and backend community publications. Issue age is elapsed time since creation, including reopened reports; there is no invented resolution timestamp. Open reports are grouped into under 7, 7–29 and 30+ days. Pending module PRs are reviewed on GitHub, so the retired website submission queue is no longer presented as a live PR count.

Issue links open the existing private inbox, with per-module links selecting open reports for that module. Optional `moduleId` and `status=all|open|closed` filters are bound and applied on the server before the existing 200-report limit. The UI explains when that limit is reached. Refresh updates usage and community reads together; an independent source failure does not replace unavailable counts with zero. Returning from moderation reloads current statistics.

## Privacy and authorization

The `#privacy` page lets visitors turn counts off on their device. Do Not Track and Global Privacy Control suppress reporting before an identifier is created. Storage failures also suppress reporting; network failures never block configuration or firmware work. The request omits cookies, guest/admin session headers and referrers.

`POST /api/usage/events` accepts only a closed event enum and two random UUIDs (`visitor`, `eventId`), with a 512-byte limit and an exact field allowlist. It rejects firmware bodies, configuration contents, arbitrary extra fields and requests from another website origin. No accounts are created. No IP address, user agent, guest identity, route, module list or firmware is stored with these site statistics. Public module reporting is separate, as described below.

The server stores only purpose-separated daily HMAC digests for duplicate suppression. Key material derives from the existing backend-only `ADMIN_KEY_SHA256`; it must never appear in frontend variables or API responses. Rotating the administrator key invalidates existing admin sessions and also changes active visitor digests, so counts around a rotation can overcount. `GET /api/admin/statistics?days=7|30|90` remains behind the existing administrator authorization boundary, including on self-hosted adapters.

D1 batches atomically count an event and a previously unseen daily visitor once. Duplicate requests with the same event ID cannot increment another metric. A daily identifier is limited to 200 requests per hour. This is a cost guard, not protection against a bot generating new identifiers.

## Storage and deployment

1. Apply the additive `0008_private_usage.sql` migration to the community D1 database.
2. Deploy the reviewed Worker, retaining its existing bindings and backend administrator secret.
3. Publish the frontend with the normal community API URL. Do not publish local QA configuration or test records.

The Worker runs cleanup hourly at minute 17, using UTC. Raw identifiers are never persisted. Hashed deduplication rows retain only today and yesterday; daily totals retain today and the preceding 89 days. Hourly scheduling means expired rows can remain until the next successful sweep. `collection_started` preserves the original coverage boundary. Rate-limit rows expire after an hour and are removed by the same sweep.

A self-hosted backend must call `cleanupUsage` on a comparable schedule. No historical analytics are imported or backfilled by this feature. Cloudflare infrastructure has its own request processing and operational metadata outside these application tables.

## Validation

Backend tests cover administrator-only reads, guest denial, exact event/visitor deduplication, atomic failure/retry behavior, strict payload rejection, browser privacy headers, daily digest rotation, rate limiting, unconfigured service behavior, empty coverage and retention boundaries. Client tests cover the outgoing allowlist, omission of credentials, local configuration deduplication, daily visitor rotation, privacy preferences and nonblocking failures.

Run `npm run check` with Node.js 24. Local UI QA uses an isolated local D1 database and synthetic events, never production records or firmware. This frontend/backend change does not modify the firmware engine, module sources or verification gates and does not require rerunning the native firmware matrix or DSP stress suite.

[D1 transactional batch documentation](https://developers.cloudflare.com/d1/worker-api/d1-database/) and [Worker cron triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) describe the deployment primitives.

## Public module popularity

Library cards and module community panels show total likes and firmware download requests for each module. The library can sort by most liked, most downloaded and highest rated; alphabetical ties are deterministic. Modules with likes but no ratings are included in the summary. Unavailable counts appear as a dash, while a successfully fetched zero is shown as zero. Public module aggregates do not grant access to administrator site statistics.

A click on an enabled firmware download button reports each unique module ID from the **completed build report**, once for that request. It does not count module selection, configuration export, build attempts, rejected builds or a confirmed file save/flash. Repeated download requests count again. Previous downloads cannot be reconstructed and are not backfilled; `0009_module_downloads.sql` records the UTC deployment coverage boundary. Counts are cumulative from that point, including through module version updates; likes remain the current total of guest likes and can decrease when unliked.

`POST /api/usage/module-downloads` accepts exactly `moduleId`, `eventId` and `visitor`, at most 512 bytes, for available build-integrated modules that have passed their build approval gate. Each module request receives an independent random event ID. No configuration ID, name, version pins, list or common build/download ID is sent. The daily random visitor identifier is used only for a separately hashed 200-request/hour rate limit; deduplication hashes do not contain a visitor or module ID. Neither rate-limit nor deduplication rows retain an association between a visitor and a module. The server receives each individual module ID and stores only its cumulative total. Infrastructure request processing remains outside these application tables.

Module reporting uses the same device opt-out, Do Not Track, Global Privacy Control, omitted credentials/referrer and nonblocking failure behavior as private site statistics. Invalid modules, extra fields, firmware bodies and other website origins are rejected. A transactional batch prevents duplicate or partially failed requests from inflating totals, including retries that change the module ID. Hashed markers retain today and yesterday and expire through the existing hourly cleanup; public totals and their coverage boundary remain. Independent requests can be blocked or lost, so public module totals and private site download totals may differ.

Apply additive migration `0009_module_downloads.sql` before deploying the new Worker. Keep the existing database bindings and administrator secret. The summary response remains an array and retains numeric `average` for compatibility with older clients; `count: 0` denotes an unrated module. New tests cover public unrated/zero totals, independent downloads, retry/failure atomicity, strict validation, privacy, rate limits, retention and discovery sorting. No firmware engine or module source changes are involved.
