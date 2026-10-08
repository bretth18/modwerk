# Module working feedback — design QA

Final result: **passed** (2026-10-08).

The user selected the third compact feedback layout after reviewing it on the full local Modwerk page, then requested yellow issue reporting. The configuration action remains primary; Following becomes a small control because downloads already follow updates. A single feedback block groups the invitation, working count and both reporting actions. The existing waveform, gauges, sidebar, tabs and creator support remain in their actual page context.

Visual reference: the third feedback-invitation mock (`exec-b6194b3e-635d-4cb4-ba81-bf0243b786dc.png`) and its selected local page implementation. `artifacts/module-feedback/feedback-card-comparison.png` places the source and final FM Synth details together, normalizing both to the actual 538px details-pane width. The native app typography/density, shorter Following label and existing creator cup are retained. Yellow issue colors are the requested refinement. Fixture discussion counts differ from the mock; they are not layout findings.

The five fidelity surfaces were checked:

- **Typography:** existing system font and title scale; 15px invitation, 12px supporting copy and count, and 13px reporting labels. Long labels wrap on small phones without clipping.
- **Spacing:** 16px feedback padding, prompt/count on the left and stacked actions on the right. At widths up to 820px the prompt and count precede paired actions. The full site shell and responsive gauges stay in place.
- **Colors:** neutral gray plus/button before saving; green check and “Reported working” only after success. Report an issue uses the existing open-issue colors (`#393222`, `#71603b`, `#efd17c`). Configuration retains the existing lavender style.
- **Assets:** actual module artwork, gauges and project icons are reused. No replacement artwork or approximate branding was introduced.
- **Copy:** “Tried it on your instrument?” and “Let others know how it went.” invite both outcomes. The count remains distinct members across versions. Automatic download follows are described to assistive technology without another large action or paragraph.

Responsive browser checks passed at 320, 375, 768 and the normal 1389px viewport: no document overflow, overlapping feedback actions or clipped labels. Reporting controls are at least 44 CSS pixels high; the 320px success state wraps to 52px. The early option preview’s margin/width overlap was corrected before the final implementation. The mobile Following alignment was corrected and checked again.

Interaction evidence: one Works press saves immediately and updates the local fixture count from 2 to 3; a green confirmation appears with a status announcement. A failed save produces an inline alert and permits retry. The yellow issue action opens the existing report form and focuses Title. These checks use a local fixture and create no production hardware claims. The earlier database/build-context coverage remains unchanged.

Evidence is saved in `artifacts/module-feedback/feedback-card-desktop.png`, `feedback-card-mobile.png`, `feedback-card-confirmed-mobile.png`, `feedback-card-error.png` and the comparison image. Required full app checks passed: 191 test files, 1,286 tests, lint, type checks, catalogue/licence checks and production build. No firmware source changed, so a native build was unnecessary.

No unresolved visual or interaction defects remain.
