<!--
Sync Impact Report
==================
Version change: 1.0.0 → 2.0.0 → 2.0.1
Ratified: 2026-08-07 | Last amended: 2026-08-07

AMENDMENT (2.0.1) — Development Workflow, bootstrap clause wording
  The 2.0.0 amendment renamed the "Ephemeral environments" section to "Preview
  environments" but left the bootstrap clause relaxing the "ephemeral-environment
  requirement" — a reference to a name that no longer existed.

  Reworded to name the preview-environment requirement, and to state explicitly
  that the bootstrap period relaxes no principle. That second point was already
  the meaning of "and nothing else"; making it explicit matters because planning
  feature 001 turned on exactly this reading — deferring offline support would
  have violated Principle IV, and the bootstrap period does not cover it.

  Also corrected the required-checks list, which still called it an "ephemeral
  environment" deploy.

  PATCH: nothing required changed. Found by /speckit-analyze.

AMENDMENT (2.0.0) — Development Workflow, environment isolation
  Was: "Each pull request MUST deploy its own isolated AWS environment."
  Now: previews MUST be independent to an observer but MAY share infrastructure
       with each other; production MUST NOT share infrastructure with previews.

  Why: planning feature 001 surfaced that the original wording married two
  separate concerns — what a visitor observes, and what a mistake can reach. The
  requirement it forced (per-pull-request infrastructure) bought infrastructural
  isolation between previews, which nothing needs, at the cost of slow creation
  and much slower teardown. It did not require the isolation that actually
  matters: keeping unmerged code away from the published site.

  Requirement that forced the loosening: per-pull-request CloudFront
  distributions take minutes to create and frequently 15+ minutes to delete,
  putting spec 001's SC-001 (preview reachable within 10 minutes) at risk and
  making teardown the least reliable step in the pipeline.

  MAJOR rather than MINOR because a MUST was downgraded — per-pull-request
  infrastructure is no longer required — which this constitution's own
  versioning policy classifies as backward incompatible, even though the
  amendment adds a stricter requirement elsewhere.

  Invalidates: nothing built. Feature 001 was in planning when this landed.

--- Original ratification -------------------------------------------------

Initial ratification. Authored interactively with the project owner; every
principle below is his decision, recorded together with the reasoning that
produced it.

Template deviations: nine principles rather than the template's five, and both
open section slots named — Scope and Technology Bounds, Development Workflow.

Principles established:
  [PROJECT_NAME] → Sucopeku
  Project identity paragraph (purpose, scope, learning goal, tiebreaker rule)
  [PRINCIPLE_1_NAME] → I. Every Change Traces to a Spec
    - exemption boundary decided: spikes only, never committed to main;
      docs and bug fixes explicitly not exempt

  [PRINCIPLE_2_NAME] → II. Exactly One Solution
    - authored puzzles are bound by the invariant too; author warned before
      sharing, not after
    - shared links: integrity-checked and refused if corrupt, but NOT
      re-verified for uniqueness; no anti-forgery claim is made

  [PRINCIPLE_3_NAME] → III. Rulesets Are Additive
    - rulesets MUST be data composed from constraint primitives; primitives are
      code and rare, rulesets are data and free. Classic Sudoku is a data file.
    - grid geometry not fixed at 9x9
    - consequence: the solver must be generic over constraints, which is the
      hardest single piece of the project and lands in feature one

  [PRINCIPLE_4_NAME] → IV. No Backend, Works Offline
    - offline play required after first visit, not merely permitted
    - scoped to gameplay; non-gameplay third-party requests (ads, analytics)
      are permitted but gameplay must not depend on them. No such feature is
      specified yet — this only leaves room for one.

  [PRINCIPLE_5_NAME] → V. Links and Saved State Never Break
    - scope widened from links alone to cover saved progress
  ADDED (beyond the template's five slots):
  VI. Progress Persists Locally
    - per-puzzle state, capped at 10, least-recently-played evicted
  VII. Generation Stays Responsive
    - target <3s (SHOULD), ceiling 10s (MUST), on a mid-range consumer device
    - open: what does the player see when generation exceeds the ceiling?
  VIII. Every Test Is Something a Player Could Do
    - deliberate experiment: no unit tests, headless browser tests only
    - stated as a positive criterion (reproducible by a user) rather than a
      technology ban; this also bars internal-API tests
  IX. Playable by Keyboard, Mouse, and Touch
    - input parity across all three; mobile is first-class
    - accessibility (colorblind, screen readers) supported only where free;
      explicitly not permitted to constrain other decisions. Deliberate scope
      call, recorded so it is not mistaken for an oversight.

  [SECTION_3_NAME] → Development Workflow
    - PR-only into main, squash-merged; branch naming deliberately unspecified
    - required checks: branch up to date with main, lint, tests, ephemeral
      deploy; list may grow
    - previews independent to observers, may share infra; production infra
      isolated from previews (amended in 2.0.0)
    - previews torn down on merge/close
    - bootstrap period: checks bind as they come online, ends by amendment;
      does NOT relax Principle I
    - stated as required ARTIFACTS (spec.md, plan.md, tasks.md current at
      merge), not as required commands — tool-independent and checkable
      against the repo
    - done = merged + checks green + artifacts current + human-written
      "## SDD Notes" section in the PR body (preserved by squash-merge)
    - test coverage of spec behaviors deliberately NOT required; that is the
      variable under study

  [SECTION_2_NAME] → Scope and Technology Bounds
    - English only; evergreen browsers, compatibility not a constraint
    - curated libraries, player-authored puzzles, and player-defined rulesets
      are not excluded and MUST NOT be designed out
  III also widened: grid geometry not fixed at 9x9

Governance decided:
  - amendments use the normal PR process, but MUST be alone in their PR so the
    rules are reviewed independently of the change that motivated them
  - semantic versioning; no further ceremony (single contributor)

Noted as a future feature, not designed here:
  - extracting "## SDD Notes" from merged commits into a published lessons-
    learned site. Needs its own spec when it happens; the constitution only
    requires that the notes exist and are recoverable.

Explicitly declined:
  - Privacy/consent rules — skipped by the owner
  - Dependency cap — not earned; Principles III, IV, and VIII already bound
    the architecture

Deferred to feature specs — recorded, not blocking ratification:
  - What a player sees when generation exceeds the 10s ceiling (Principle VII)
  - Whether an authored puzzle with ZERO solutions warns the author the same way
    one with several does (Principle II)
-->

# Sucopeku Constitution

Sucopeku is a browser-based site for playing Sudoku and variants with altered
rulesets. It generates new puzzles on demand in the browser, and any specific
puzzle can be shared by link.

The project's second purpose is learning Spec-Driven Development. The site is
the vehicle; practicing the full specify → clarify → plan → tasks → implement
cycle is the point. Where speed of delivery and fidelity to the process
conflict, the process wins.

## Core Principles

### I. Every Change Traces to a Spec

No implementation code is written before a spec exists for the behavior it
implements. Every change MUST trace to a numbered feature in `specs/`, and the
pipeline order is fixed: specify → clarify → plan → tasks → implement.

When implementation reveals the spec was wrong, the spec MUST be amended and the
downstream artifacts regenerated. Code that diverges from its spec is a defect,
whether or not it works.

There is exactly one exemption: an **exploratory spike** — throwaway code written
to learn whether an approach is viable. A spike MUST NOT be committed to `main`
and MUST NOT be promoted into shipped code. What a spike teaches re-enters the
project as a spec, not as a merge.

Two things are explicitly NOT exempt, recorded here so they are not improvised
later:

- **User and contributor documentation.** Docs are a deliverable and MUST have a
  spec like any other.
- **Bug fixes.** These need no new spec, but they MUST trace to the existing
  spec that defines the correct behavior. If no spec covers it, the gap is in
  the spec and is fixed there first.

Spec Kit governance artifacts — this constitution, and the `spec.md`, `plan.md`,
and `tasks.md` files themselves — are governed by the Governance section below,
not by this principle.

*Rationale: Learning Spec-Driven Development is a stated purpose of this project.
The habit is won or lost on small changes, where skipping the process is most
tempting and least costly in the moment.*

### II. Exactly One Solution

Every puzzle Sucopeku presents MUST have exactly one solution under the ruleset
it is played with. A generated puzzle MUST NOT reach a player until the engine
has verified uniqueness; an unverified puzzle is not a puzzle.

Verification MUST be mechanical — a solver that establishes no second solution
exists — not an assumption inherited from the generation strategy. Generation
techniques that are *believed* to yield unique puzzles MUST still be checked.

**Authored puzzles.** Should players ever be able to author puzzles, this
invariant is not relaxed for them. An authored puzzle MUST have exactly one
solution before it can be shared or played as a finished puzzle, and the author
MUST be told while they can still fix it — not after they have shared it.

**Shared links.** A puzzle arriving by link MUST carry an integrity check, and a
link failing that check MUST be refused with a clear message rather than loaded
as a playable grid. Sucopeku does NOT re-verify uniqueness for linked puzzles,
and makes no claim of resistance to deliberate forgery: the encoding ships to
the browser, so a determined person can always craft a URL. The bar here is
detecting corrupt links, not defeating an adversary who has nothing to gain.

*Rationale: A grid with multiple solutions cannot be solved by deduction alone,
only by guessing. The failure is silent: nothing looks wrong until a player has
already spent real time on it, and by then the trust is gone. Link integrity is
scoped to real failures — truncation, mangling, and format drift — because the
adversarial case costs real effort to defend and harms only the forger.*

### III. Rulesets Are Additive

Adding a ruleset MUST NOT require modifying any existing ruleset, nor the
validator, solver, or generator. A variant is introduced by adding code, not by
editing code that already works.

This requires that rules be expressed as self-contained units the engine
consumes uniformly. Classic Sudoku is one such unit and holds no privileged
position in the engine — its row, column, and box constraints MUST NOT be
hardcoded into shared machinery.

The one permitted edit to existing code is registering the new ruleset so the
application can find it.

**Rulesets are data, not code.** A ruleset MUST be expressible as data — a
composition of constraint primitives over sets of cells — and MUST NOT require
procedural logic written specifically for it. The validator, solver, and
generator operate on primitives generically and MUST NOT know which ruleset they
are serving.

This splits the engine into two layers with different rules:

- A **primitive** — all-different, region sum, strict ordering along a path,
  pairwise relation, and so on — is code. Adding one is expected to be rare, and
  is the only case where variant support touches the engine.
- A **ruleset** is data composed from primitives. Adding one MUST always be
  possible without writing code.

Classic Sudoku is therefore a data file: all-different over each row, column,
and box. It has no implementation of its own.

**Grid geometry is not fixed either.** The engine MUST NOT assume a 9×9 board,
square regions, or any particular dimensions. Other sizes and irregular region
shapes MUST be expressible without rewriting the validator, solver, or
generator. Classic Sudoku is a configuration, not the shape of the code.

**How this is checked:** read the diff that introduces a ruleset. If it touches
the internals of an existing ruleset or adds a variant-specific branch to the
engine, it violates this principle.

*Rationale: Variants are not a future nice-to-have; they are half of what this
site is. Hardcoding classic Sudoku is the cheapest possible feature-one
shortcut, and it converts every later variant into a rewrite of the validator,
solver, and generator at once.*

### IV. No Backend, Works Offline

Sucopeku MUST run entirely in the browser and MUST be deployable as static
assets. No application server, database, or hosted service may be required to
play.

**Offline is required, not a bonus.** After a first visit, the site MUST load and
be fully playable with no network connection at all — including generating new
puzzles, opening a previously saved game, and every ruleset already available.
Losing connectivity mid-game MUST cost the player nothing.

Everything a player does — generating a puzzle, validating entries, solving,
saving progress, opening a shared link — MUST work without any network request
beyond fetching the site's own static files. Puzzle state and progress live in
the browser.

This constrains gameplay, not the page. Third-party requests serving
non-gameplay purposes are permitted, provided no part of playing depends on
them: the site MUST remain fully playable when such requests fail, are blocked,
or are slow. A blocked third-party resource may cost a player nothing but the
element it would have rendered.

Introducing a backend requires amending this constitution, not merely a plan.

*Rationale: A backend would add hosting, deployment, and operational cost to a
project that needs none of it. Forbidding one also keeps the puzzle engine
honest: generation and solving must be fast enough to run on the player's own
device, with no server to hide behind.*

### V. Links and Saved State Never Break

Any link Sucopeku has ever produced MUST remain playable, presenting the same
puzzle under the same ruleset, after any subsequent change to the site.

Saved progress carries the same guarantee: a puzzle left in progress before a
release MUST load, with its state intact, after it. Shipping an update MUST
never cost a player a game they were in the middle of.

Both are encoded player data, and both are bound by the same four requirements:

- Each format MUST carry a version identifier from its very first shipped
  version. A format with no version can never be changed safely.
- New capabilities — additional rulesets, new tile kinds, new cell values, new
  player markings — MUST extend a format additively. Existing fields MUST NOT be
  repurposed, reordered, or redefined.
- Every format version ever released MUST remain readable. Decoders are added,
  never removed.
- A ruleset that has appeared in a shared link or in saved state MUST NOT be
  deleted, renamed in the encoding, or have its play semantics changed.

The two differ in one respect. Saved state is reachable, so migrating it to a
newer format on load is permitted — the requirement is that no player-visible
progress is lost, not that the stored bytes stay frozen. A link is unreachable:
it lives in someone else's chat history, and no migration can ever touch it, so
its old formats MUST be decoded as-is forever.

**How this is checked:** a change that alters the meaning of an existing encoded
field, drops a reader for a released format, or changes an existing ruleset's
behavior violates this principle, regardless of how much cleaner it makes the
format.

*Rationale: With no backend (Principle IV), the link is not a pointer to a
puzzle — it IS the puzzle, and saved state is the only copy of a player's
progress that exists anywhere. There is no database to migrate and no redirect
to add. A link already sent to someone is beyond reach forever, so the only
moment this can be gotten right is before the first one is shared.*

### VI. Progress Persists Locally

A puzzle in progress MUST be saved in the browser and restored when the player
returns to it. Reopening a puzzle — by reloading, navigating back, or following
its link again — MUST restore the player's prior state rather than a blank grid.

State is kept per puzzle, not merely for the most recent one: a player may have
several puzzles in progress and return to any of them. Sucopeku retains at most
**10** puzzles; beyond that, the least recently played is dropped.

Saving MUST NOT depend on the player performing an explicit action. There is no
save button to forget, and a closed tab is not a discarded game.

Because there is no backend (Principle IV), this state is local to one browser
on one device. Sucopeku makes no promise that progress follows a player
elsewhere, and clearing browser data ends a session permanently.

*Rationale: A Sudoku takes long enough that interruption is the normal case, not
the exception. Losing a half-finished grid to an accidental reload is the kind
of failure that makes someone stop using a site and not come back.*

### VII. Generation Stays Responsive

Puzzle generation MUST NOT lock the browser. The interface MUST stay responsive
to input and continue rendering for the entire time generation runs. A frozen
tab is a defect no matter how good the resulting puzzle is.

Generation SHOULD complete within 3 seconds and MUST complete within 10. The
3-second target is what the generator is designed and optimized toward; the
10-second ceiling is a hard limit, and exceeding it is a defect to be fixed, not
variance to be tolerated.

Both figures are measured on a mid-range consumer device — an average desktop or
a current mainstream phone — not on the fastest machine available. Hardware
varies, and the bound only means something when it names the hardware it assumes.

Because generation can take seconds, the player MUST be shown that work is in
progress. A still screen is indistinguishable from a broken one.

*Rationale: Principle II requires mechanical uniqueness verification and
Principle IV forbids a server to run it on, so the most expensive computation in
the project executes on the player's own device while they wait. That makes this
the likeliest place for Sucopeku to feel broken, and the bound exists so the
cost lands on the generator's design rather than on the player.*

### VIII. Every Test Is Something a Player Could Do

Every automated test MUST correspond to an action a player can perform and an
outcome they can observe. If a person sitting in front of the site could not
carry out the test themselves, it does not belong in the suite.

This is why Sucopeku has no unit tests: nobody can call a function from a Sudoku
grid. The same reasoning rules out tests against internal APIs — the bar is not
which tool runs the test, but whether a user could reach the behavior. Tests are
therefore headless browser tests, driving the site as a player does.

When a required behavior cannot be tested this way, the spec is what gets
examined first. A behavior no player can observe is usually a sign the spec
described an implementation rather than an outcome.

Adding a test that fails this bar requires amending this constitution. It is not
a judgment call to be made in the moment.

*Rationale: This is a deliberate experiment, and testing it is one of the reasons
the project exists. The theory: if a spec is written clearly enough and an AI
agent implements against it, unit tests are redundant — they verify structure
the spec never asked for, and they obstruct an implementer that is free to
restructure at will. Tests written at the player's boundary are the ones a spec
can actually justify.*

*The experiment fails loudly rather than quietly: if defects start reaching
`main` that a unit test would plainly have caught, that is the result, and it is
recorded in an amendment rather than patched over by quietly adding one.*

### IX. Playable by Keyboard, Mouse, and Touch

Sucopeku MUST be fully playable three ways, with no feature reachable by only
one of them:

- **Keyboard**, on a desktop browser
- **Mouse or pointer**, on a desktop browser
- **Touch**, on a mobile phone screen

Mobile is a first-class target, not a scaled-down desktop layout. A 9×9 grid
carrying variant markings MUST remain usable at phone width.

**Accessibility posture.** Colorblind-safe presentation, screen reader support,
and similar accommodations are welcome where they are free, and MUST NOT
constrain decisions made for other reasons. Where an accommodation would change
a design chosen on other grounds, the other decision wins. Sucopeku makes no
accessibility conformance claim.

*Rationale: Input parity is cheap when designed in and expensive to retrofit —
a mouse-first grid rebuilt for keyboard means rewriting the input layer and
every test that touches it. The accessibility posture is a deliberate scope
decision: this project trades conformance work for progress on the experiments
it exists to run.*

## Scope and Technology Bounds

**Language.** English only. Localization is out of scope, and no obligation to
structure the interface for translation is created here.

**Browser support.** Sucopeku targets current, evergreen browsers. Compatibility
MUST NOT constrain technical decisions: modern platform features may be used as
soon as they are broadly available in current browser versions, and support for
legacy or end-of-life browsers is not a requirement.

**Deliberately not ruled out.** The following are neither committed to nor
excluded, and the architecture MUST NOT preclude them:

- Puzzle formats and grid geometries beyond classic 9×9
- Curated puzzle libraries, whether as playable content or as seeds that make
  generation faster
- Puzzles authored by players
- Rulesets defined by players rather than shipped with the site. Principle III
  makes this structurally possible by requiring rulesets to be data; what is not
  committed to is the interface for authoring them

This is a constraint on design, not a roadmap. Nothing here is promised, and
none of it needs building until a spec calls for it — but a plan that makes one
of these impossible to add later is a plan that needs revisiting.

## Development Workflow

**Branching and merge.** Direct commits to `main` are prohibited. Every change
reaches `main` through a pull request, and every pull request is squash-merged.

**Required checks.** A pull request MUST NOT merge until all of the following
pass:

- The branch is up to date with `main`
- Linting
- Automated tests
- A successful deploy to that pull request's preview environment

Being up to date is listed first because it is what makes the rest mean
anything. A green check on a stale branch reports that the code passed against a
`main` that no longer exists.

This list is expected to grow as the project matures. Adding a check is a normal
change; removing one requires the same scrutiny as amending a principle.

**Preview environments.** Each pull request MUST be served as a complete,
standalone copy of the site at its own address, so a change can be exercised as a
real deployment rather than only in tests. To anyone loading it, a preview MUST be
indistinguishable from an independent site, and MUST NOT be affected by any other
pull request. A preview MUST be removed when its pull request is merged or closed.

**Production is isolated; previews are not.** Pull requests MAY share deployment
infrastructure with one another — their independence is a property observers see,
not a property of the resources underneath. Production MUST NOT share
infrastructure with them. The published site runs on its own resources, reached by
its own credentials, so that a mistake in unmerged code — including a mistake in
an infrastructure definition — cannot reach it.

These environments are deployment infrastructure, not an application backend.
Principle IV still holds: what they serve is a static site that runs entirely in
the browser.

**Nothing merges without a spec.** No pull request may merge unless every code
change in it traces to a spec — either one already in `specs/`, or one added in
the same pull request. Spikes are never merged; see Principle I.

**Required SDD artifacts.** The obligation is on the artifacts, not on which
command produced them. Before a pull request may merge, the feature's directory
under `specs/` MUST contain the following, each current and consistent with the
code being merged:

| Artifact | MUST contain |
|---|---|
| `spec.md` | The behavior being built, in user-facing terms, with its ambiguities resolved and that resolution recorded in the spec |
| `plan.md` | The technical approach and design decisions, evaluated against this constitution |
| `tasks.md` | The ordered work, with completion state accurately reflecting what was built |

An artifact that contradicts the merged code is a defect, and the artifact is
what gets corrected. Work that produced no artifact change still requires the
artifacts to be accurate — silence is not currency.

Anything that exists only as a report, and leaves no committed artifact behind,
is RECOMMENDED where useful but never required. Cross-checking spec, plan, and
tasks against one another before implementing is the clearest example: valuable,
and not a gate.

**Bootstrap period.** A check cannot gate the work that creates it. Until a
required check exists, it does not block a merge; each check becomes binding the
moment it is in place. The bootstrap period ends once every required check is
enforced, and that ending MUST be recorded as an amendment to this constitution
so the exemption cannot quietly outlive its purpose.

The bootstrap period relaxes two things and nothing else: the required checks
listed above, and the preview-environment requirement in this section. It
relaxes no principle. Principle I in particular is never relaxed — the pipeline
and its infrastructure are themselves features, and MUST be specified before
they are built.

**Definition of done.** A feature is done when its pull request is merged with
every required check green, its SDD artifacts are current, and its pull request
body contains a section headed exactly:

```markdown
## SDD Notes
```

answering two questions:

1. Would a unit test have caught anything that reached `main`?
2. Where was the spec wrong or thin, and when did that surface?

"Nothing" is a valid answer to either, and a run of them is itself the result.
Because pull requests are squash-merged, this section lands in the commit
message on `main` and is permanently recoverable from history — no separate file
is required.

These notes MUST be written or edited by a human before merge. An implementer
assessing whether its own output needed tests is not evidence.

**What is deliberately not required:** that every behavior in a spec be covered
by a test. Whether a clear enough spec removes the need for that coverage is one
of the questions this project exists to answer, and forcing the coverage would
destroy the evidence.

## Governance

This constitution supersedes habit and preference. Where a plan, a task, or a
suggestion conflicts with it, the constitution wins.

**Amendments follow the normal pull request process**, with one addition: an
amendment MUST be alone in its pull request. Nothing but this file changes. A
change to the rules is therefore always reviewable on its own terms, never
bundled with — or justified by — the feature that prompted it.

Amendments require no spec. Principle I governs code; this section governs this
document.

**Versioning.** This file is versioned semantically:

- **MAJOR** — a principle is removed or redefined incompatibly, or a MUST is
  downgraded
- **MINOR** — a principle or section is added, or guidance is materially
  expanded
- **PATCH** — clarification and wording that changes nothing required

Every amendment updates the version and the Last Amended date, and records what
changed in the Sync Impact Report at the top of this file.

**Compliance.** Plans are evaluated against these principles before tasks are
generated, and no pull request merges without its SDD artifacts current — both
covered under Development Workflow. Beyond that, this project has one
contributor and needs no further ceremony. The check that matters is whether the
artifacts tell the truth about the code.

**Version**: 2.0.1 | **Ratified**: 2026-08-07 | **Last Amended**: 2026-08-07
