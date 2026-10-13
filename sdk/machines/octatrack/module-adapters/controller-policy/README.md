# Private controller association preparation

These files prepare a board-only lifetime contract for the resident Sidechain,
Output Matrix and Analog BD engines. They do not change the loader, generated
catalogue, public base or package admission. The strong policy bridge has zero
entries and refuses every buffer and fixed-resource claim.

`controller_association` accepts a trusted compiled declaration and keeps the
encoded package SHA256, source-policy SHA256, module and policy/state/parameter
revisions together. A reconstructed, registered pool allocation then binds its
whole canonical extent, image offset/length and a board-issued nonzero monotonic
generation. Uploaded addresses, package names, caller readiness and a reused
pool address cannot establish this association.

All calls require the actual loader's stable lock. The production adapter still
needs to provide and independently qualify each backend callback:

Positive proof callbacks require exactly `1`; missing or unknown proof refuses.
An unknown publication result quarantines both images rather than confirming
ACTIVE. A `0` publication result means definitely unchanged, not partial commit.

- `owns_image` checks the whole actual registered allocation, including the
  header and patch sites, against the immutable binding.
- `resources_idle` checks complete current, target, future and retiring resource
  claims on both cores, including physical shared aliases. Only an exact owned
  lease may be excluded from a conflict with itself.
- `writes_blocked` includes the saved-file export latch.
- `start` owns the actual submitted packet and ACK slot. Its result distinguishes
  definitely unchanged work from an owned pending job and an unknown/touched job.
- `job_closed` confirms that the backend released that exact job's packet/storage.
- `publication_confirmed` follows actual DSP acknowledgment and ColdFire commit.
- `roots_clear` checks current, paused and foreign controller references, including
  the independently required Analog BD Part fence.

Jobs bind generation, a board ticket, the actual 16-bit wire sequence, core,
operation, reset offset/count and CAS expected/desired masks. RESET ranges are
bounded to 24 words. The backend must refuse actual transport sequence wrap or
reuse, including unrelated operations: the helper cannot observe unreported wire
wraps. Exhausted generations and tickets also refuse. RESTORE is reserved but
remains closed until its actual source/backend contract has been proved.

Each core must acknowledge initialization, release its reset job storage and
acknowledge activation before the pure pending-journal query permits control
writes. The initial acknowledged ColdFire commit is possible before ACTIVE;
only the actual publication callback establishes ACTIVE. This query is not a
public readiness interface. Production must resolve a reviewed controller entry
to its exact owned image/package/policy/generation binding.

Cancellation, timeout, partial acknowledgment or unknown submission retains both
incoming and predecessor images/resources. Late ACKs can drain owned jobs but
cannot make a quarantined generation ready. Retirement requires exact disable
ACKs on every required core, actual job release and foreign-root clearance. A
predecessor also remains held while an incoming journal references it, until the
incoming generation is actually ACTIVE or released. No helper outcome alone
authorizes freeing an allocation or publishing a controller.

`test_controller_association.c` uses trusted synthetic backend events and the
actual resident resource oracle at two pool origins. It checks identity/layout
drift, owned extents, sequence exhaustion, partial ACK quarantine, pending CF
publication and retirement. Native C execution and MCF54455 compilation do not
prove actual transport integration, audio headroom, physical timing, complete
base fit or reboot persistence. Source-bound controller declarations and the
loader's asynchronous pending/generation backend remain separate qualification.
