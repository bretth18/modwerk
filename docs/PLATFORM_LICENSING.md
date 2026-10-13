# Platform licensing

Modwerk's independent API/backend is source available under **Elastic License
2.0 (ELv2)**. Its licensor is Jannik Aßfalg (`repeat98`). The browser frontend
remains GPL-3.0-or-later. This is a component licensing change, not a blanket
relicensing of the repository or an additional restriction on its GPL code.

The authoritative scope is [LICENSE](../LICENSE), with full unmodified texts in
[LICENSES/Elastic-2.0.txt](../LICENSES/Elastic-2.0.txt) and
[LICENSES/GPL-3.0-or-later.txt](../LICENSES/GPL-3.0-or-later.txt).

## Scope

| Component | Licence in this revision |
| --- | --- |
| Original backend code in `server/`, `worker.ts`, `functions/` and `migrations/` | Elastic-2.0 |
| Original shared helpers explicitly listed in `LICENSES/platform.json` | GPL-3.0-or-later OR Elastic-2.0 |
| Browser frontend and other original Modwerk code without a separate declaration | GPL-3.0-or-later |
| SDKs, module source/packages, vendored builders, media, dependencies and contributed catalogue/machine data | Their existing component licences and notices |

The shared helpers have an alternative licence so the GPL frontend and the
ELv2 backend can each use them under compatible terms. This alternative does
**not** apply to the backend as a whole: its implementation is ELv2-only in this
revision. The inventory is explicit; it does not cover all of `src/`.

Generated catalogues retain their module/machine provenance and attribution.
The inventory's `dataFiles` records independently licensed data consumed by the
backend, not permission to relicense those records or their underlying modules.
Community posts, user data and submitted media are not relicensed by this change.

## Permissions and limits

ELv2 permits use, inspection, modification and redistribution subject to its
full terms. It prohibits providing the covered software to third parties as a
hosted or managed service that exposes a substantial set of its features or
functionality. The restriction is not limited to paid services. Local development
and internal use remain possible; a public fork exposing the covered backend's
account, forum, reporting or other substantial functionality needs separate
permission from the licensor. Contact [support@modwerk.app](mailto:support@modwerk.app)
for permission requests.

ELv2 also preserves licensing/copyright notices and prohibits circumvention of
licence-key functionality. The licence text governs; this explanation does not
add terms. [Official text](https://www.elastic.co/licensing/elastic-license) and
[official FAQ](https://www.elastic.co/licensing/elastic-license/faq).

ELv2 is source available, not an OSI open-source licence. It does not prohibit
every form of competing software: redistribution is permitted under its terms,
independent implementations can use the same technology choices, and versions
already released under GPL remain available under GPL. This change cannot
prevent someone hosting a compliant fork of an earlier GPL revision.

## Ownership and dependency audit

The implementation audit used `main` at
`65452618de82a23ea56a7f0cd864044740e0b810` on **9 October 2026**.

- All commits touching `server/`, `worker.ts`, `functions/` and `migrations/`
  in that history were attributed to the owner (`repeat98` / Jannik Aßfalg) or
  the owner's coding assistant. Human co-author trailers identify the owner;
  the other trailers identify coding assistants. No outside human contribution
  was identified in this backend scope.
- The 35 shared runtime source files listed in `LICENSES/platform.json` have
  the same owner/assistant history. Existing source notices and imports were
  inspected; no Elekloader or other GPL third-party implementation was found in
  the backend's runtime source graph. Direct backend npm dependencies declare
  MIT; dependencies retain their own terms.
- Outside contributors have changed frontend/build tooling and generated
  module/machine data. Those works retain their licences. In particular,
  `src/catalog/module-contract-v3.ts` contains an outside contribution and is
  **not** in the alternative-licence inventory. Backend references to it are
  type-only, erased during compilation; the source itself stays GPL.
- The frontend directly imports Elekloader's GPL kit, including its client and
  helpers. Its current integration and other outside frontend contributions
  remain GPL. It is not presented as ELv2, and separating a worker alone is not
  treated as evidence of an independent copyright work.

The production Worker was also bundled with `wrangler deploy --dry-run --config
wrangler.worker.jsonc --outdir <private-temp-folder> --metafile <private-temp-file>`.
Its actual input manifest contains no Elekloader kit, firmware engine, Octabam
implementation or `module-contract-v3.ts`. No deployment was performed by this
audit.

This is a repository provenance audit, not legal clearance or a claim that Git
attribution alone proves copyright ownership. The owner reviews this scope at
merge. Extending ELv2 to the frontend needs a separate ownership and dependency
review, and any required permissions from the relevant rights holders.

## Contributions and maintenance

Contributions to the backend are submitted under ELv2. Contributions to an
inventoried shared helper are submitted under GPL-3.0-or-later OR Elastic-2.0.
Contributors retain copyright and must have authority to grant the applicable
licence; no copyright assignment or general permission for future relicensing
is implied. SDK/module contributions retain their declared licences.

Run `npm run licenses:generate` after changing scope or notice inputs, then
`npm run check -- --base origin/main`. The licence check verifies the backend's
runtime imports against the explicit shared/data inventory and rejects backend
implementation imports from the production frontend. New cross-boundary imports
require an ownership/compatibility review; do not silence the check by adding
third-party GPL code to the shared inventory.

The public licence page includes this component scope and the full platform
terms alongside third-party notices. The native SDK notice bundle is kept
separate so this change does not alter module packages or their licences.
