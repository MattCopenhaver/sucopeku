# Feature Specification: Delivery Pipeline

**Feature Branch**: `001-delivery-pipeline`

**Created**: 2026-08-07

**Status**: Complete

**Input**: User description: "Establish the delivery pipeline for Sucopeku. A contributor opening a pull request gets an isolated, working deployment of the site from that branch, reachable by URL, which disappears when the pull request closes. Pull requests cannot merge unless linting and automated tests pass. The site itself is a placeholder page with no gameplay."

## User Scenarios & Testing *(mandatory)*

The user of this feature is a **contributor** to Sucopeku, not a puzzle player. The
site it delivers is deliberately empty; what is being built is the path a change
travels from proposal to `main`.

### User Story 1 - See a change running before merging it (Priority: P1)

A contributor pushes a branch and opens a pull request. Shortly afterward, the
pull request tells them where to find a working copy of the site built from that
branch. They open it in a browser — on a desktop and on a phone — and see the
change actually running, isolated from `main` and from any other open pull
request.

**Why this priority**: This is the feature's core value and the hardest part to
build. Without it, changes are reviewed as text and only observed after they
land. It is also the check every later feature depends on, so nothing else can
be gated until it works.

**Independent Test**: Open a pull request containing a visible change to the
placeholder page, wait for the pull request to report a deployment address, load
that address, and confirm the change is present. Delivers value on its own even
if no merge gating exists yet.

**Acceptance Scenarios**:

1. **Given** a branch with a change to the placeholder page, **When** a pull
   request is opened for it, **Then** the pull request reports an address where
   that version of the site can be loaded.
2. **Given** a pull request with a reported deployment address, **When** the
   address is opened in a browser, **Then** the placeholder page loads and shows
   the branch's version of the content.
3. **Given** a pull request with an existing deployment, **When** a further
   commit is pushed to the branch, **Then** the deployment at the same address
   updates to reflect the newer commit.
4. **Given** two pull requests open at the same time, **When** each deployment
   address is loaded, **Then** each shows only its own branch's content.

---

### User Story 2 - Broken work cannot reach main (Priority: P2)

A contributor opens a pull request whose code fails linting, fails an automated
test, or fails to deploy. The pull request refuses to merge and states which
requirement failed. When the contributor fixes the problem and pushes again, the
pull request becomes mergeable.

**Why this priority**: Independently valuable — gating works even if deployments
are still manual — but it depends on there being checks to run, and one of those
checks is the deployment from Story 1.

**Independent Test**: Open a pull request that deliberately fails linting,
confirm merging is blocked and the reason is visible, push a fix, and confirm
merging becomes available.

**Acceptance Scenarios**:

1. **Given** a pull request whose code fails linting, **When** merging is
   attempted, **Then** the merge is refused and the failing check is identified.
2. **Given** a pull request whose automated tests fail, **When** merging is
   attempted, **Then** the merge is refused and the failing check is identified.
3. **Given** a pull request whose deployment fails, **When** merging is
   attempted, **Then** the merge is refused.
4. **Given** a pull request whose branch is behind `main`, **When** merging is
   attempted, **Then** the merge is refused until the branch is brought current.
5. **Given** a pull request meeting every requirement, **When** it is merged,
   **Then** it lands on `main` as a single commit.
6. **Given** any change to `main`, **When** it is attempted outside a pull
   request, **Then** it is rejected.

---

### User Story 3 - The site is publicly reachable (Priority: P3)

Work that reaches `main` is published at a permanent address that anyone can
open. It is deployed by exactly the same procedure that produced every pull
request's preview, but onto its own infrastructure, so that nothing an unmerged
branch does can reach it — and it is never torn down.

**Why this priority**: Sucopeku is not visible to anyone until this exists. It
ranks below preview deployments and merge gating because the published page has
no gameplay yet, so its audience is nobody. Building it on the identical path
means the publish route is exercised by every pull request long before it
matters.

**Independent Test**: Merge a change to the placeholder page and confirm it
appears at the permanent address, deployed by the same process a preview uses.

**Acceptance Scenarios**:

1. **Given** a change merged to `main`, **When** the permanent address is
   opened, **Then** the merged version of the placeholder page loads.
2. **Given** a further change merged to `main`, **When** the permanent address is
   opened, **Then** it reflects the newer change.
3. **Given** the permanent deployment, **When** its deployment procedure is
   compared with a pull request deployment's, **Then** the ordered steps are the
   same, differing only in target and in lifetime.
4. **Given** all pull requests are closed, **When** the permanent address is
   opened, **Then** the site still loads.
5. **Given** a workflow running from an unmerged branch, **When** it attempts to
   modify the published site, **Then** it is denied.
6. **Given** a commit on `main` that fails linting or the browser suite, **When**
   publishing is attempted, **Then** it does not proceed and the previously
   published version keeps serving.

---

### User Story 4 - Finished work leaves nothing behind (Priority: P4)

A contributor merges or closes a pull request. Its deployment stops existing, and
the resources that served it stop costing anything.

**Why this priority**: Nothing is blocked by its absence in the short term, but
without it every pull request permanently adds cost, and the total grows with no
upper bound.

**Independent Test**: Note a pull request's deployment address, close the pull
request, then confirm the address no longer serves the site and its resources are
gone.

**Acceptance Scenarios**:

1. **Given** a pull request with a live deployment, **When** the pull request is
   merged, **Then** its deployment and the resources behind it are removed.
2. **Given** a pull request with a live deployment, **When** the pull request is
   closed without merging, **Then** its deployment and the resources behind it
   are removed.
3. **Given** no open pull requests, **When** deployment resources are reviewed,
   **Then** none remain from previous pull requests.

---

### Edge Cases

Each carries an identifier and states an obligation, per constitution 2.1.0.
They are traced and covered by tasks exactly as functional requirements are. An
edge case whose satisfaction *changes the design* rather than exercising it is
promoted to a requirement instead — EC-004 was promoted to FR-014 for that
reason.

- **EC-001**: When a deployment fails partway, leaving some resources created and
  others not, the pull request MUST be blocked and the partial resources MUST NOT
  survive the pull request.
- **EC-002**: When removal of a deployment fails, the failure MUST be visible
  rather than silent, since a silent failure accrues cost indefinitely.
- **EC-003**: When a pull request changes both a specification and code, every
  check MUST run. The exemption in FR-013 applies only when nothing executable
  changed.
- **EC-004**: *Promoted to FR-014.* A specification-only merge to `main` must not
  republish the site. Satisfying it required a job that did not exist, which the
  promotion test makes a requirement rather than an edge case.
- **EC-005**: When a deployment address is entered without a trailing slash, it
  MUST load a working page. Serving the right document at the wrong address is a
  failure that looks like a success: the page renders unstyled, because the
  browser resolves relative references against the parent directory.
- **EC-006**: When a closed pull request is reopened, it MUST return to having a
  working deployment.
- **EC-007**: When several commits are pushed in quick succession, the deployment
  MUST end up matching the most recent commit, not an earlier one.
- **EC-008**: When two pull requests are open simultaneously, neither may observe
  or overwrite the other's deployment.
- **EC-009**: A pull request opened from a fork is out of scope for a
  single-contributor project; see Assumptions. It MUST fail safely rather than
  gain credentials.
- **EC-010**: When a merge succeeds but publishing to the permanent address
  fails, the previously published version MUST keep serving — a working old site
  is the correct fallback — and the failure MUST be reported, since `main` and
  the published site now disagree.
- **EC-011**: When a visitor holds a cached copy and a new version is published,
  the next visit with a network MUST show the new version. A cache that survives
  forever is a site that can never be updated.
- **EC-012**: When two merges land in quick succession, the permanent address
  MUST end up matching the later merge, not the earlier one.

## Requirements *(mandatory)*

### Functional Requirements

**Preview deployments**

- **FR-001**: Every open pull request MUST have its own deployment of the site,
  built from that pull request's branch and isolated from all others.
- **FR-002**: The address of a pull request's deployment MUST be discoverable
  from the pull request itself, without a contributor having to look it up
  elsewhere, and MUST load a working page whether or not it is entered with a
  trailing slash.
- **FR-003**: When new commits are pushed to a pull request, its deployment MUST
  be updated to match the most recent commit.
- **FR-004**: A pull request's deployment MUST be reachable from both a desktop
  browser and a mobile browser.
- **FR-005**: A pull request's deployment MUST be publicly reachable by anyone
  holding its address. No authentication layer is required or permitted in front
  of preview deployments, since the effort is disproportionate to what a preview
  exposes.

**Merge requirements**

- **FR-006**: A pull request MUST NOT be mergeable unless its branch is current
  with `main`.
- **FR-007**: A pull request MUST NOT be mergeable unless linting passes.
- **FR-008**: A pull request MUST NOT be mergeable unless the automated test
  suite passes.
- **FR-009**: A pull request MUST NOT be mergeable unless its deployment
  succeeded.
- **FR-010**: When a requirement blocks a merge, the pull request MUST identify
  which requirement failed.
- **FR-011**: Changes MUST NOT reach `main` except through a pull request.
- **FR-012**: A merged pull request MUST land on `main` as a single commit.
- **FR-013**: When a pull request changes only Spec Kit artifacts and
  documentation — no site source, tests, infrastructure, scripts, or workflow
  definitions — the checks that exercise code MUST NOT run: linting, the browser
  suite, and deployment. Such a pull request MUST nonetheless remain mergeable.
  A required check that never reports blocks a pull request permanently, so
  "does not run" cannot be implemented by preventing the check from existing.
- **FR-014**: When a merge to `main` changes only Spec Kit artifacts and
  documentation, the site MUST NOT be republished — nothing it serves has
  changed. Linting and the browser suite still run, per FR-017, which requires
  them after every merge and makes no exception for documentation. Promoted from
  EC-004: satisfying it required a job that did not previously exist.

**Publishing from main**

- **FR-015**: Merging to `main` MUST publish the site at a permanent address
  reachable by anyone, and MUST update it on every subsequent merge.
- **FR-016**: The same checks required of a pull request — linting and the
  browser suite — MUST also run on `main` after every merge. Publishing MUST NOT
  proceed unless they pass. `main` is not exempt from the standard applied to
  everything proposed for it.
- **FR-017**: The permanent deployment MUST be produced by the same procedure as
  a pull request deployment — the same ordered steps, run the same way. Only two
  differences are permitted: it targets production's own infrastructure, and it
  is never removed.
- **FR-018**: Production MUST NOT share deployment infrastructure or credentials
  with pull request previews. A change to preview infrastructure, or a workflow
  running from an unmerged branch, MUST NOT be able to modify the published site.
- **FR-019**: Pull request previews MAY share infrastructure with one another,
  provided each remains independently reachable and unaffected by the others.
- **FR-020**: Publishing MUST be atomic from a visitor's point of view. At no
  point during a publish may the site be unavailable, and at no point may a
  visitor receive a combination of files belonging to different versions.
- **FR-021**: A publish MUST NOT delete or overwrite files belonging to a
  previous version. Every file the site has ever served remains retrievable, so a
  page already open in a browser cannot break partway through a visit. This is
  checkable by listing the stored objects after a publish and confirming the
  previous version's files are still present.
- **FR-022**: A failed publish to the permanent address MUST be surfaced rather
  than passing silently, per FR-025. A failed publish MUST leave the previously
  published version serving, not a partially updated site.

**Cleanup**

- **FR-023**: When a pull request is merged or closed, its deployment and every
  resource created for it MUST be removed. This MUST NOT affect the permanent
  deployment.
- **FR-024**: A failure to remove a pull request's deployment MUST be surfaced
  rather than passing silently, per FR-025. Because removal runs after a pull
  request closes, reporting it on that pull request alone is not sufficient.

**Failure reporting**

- **FR-025**: Every pipeline failure MUST be reported on the pull request that
  caused it, including failures that occur after the pull request has closed.
- **FR-026**: The project owner MUST receive a notification of every reported
  failure without having to check for it, including failures reported against a
  closed pull request.
- **FR-027**: A failure that prevents the pipeline from reporting at all — the
  automation itself failing to run or crashing before it can report — MUST still
  reach the project owner.

**The site itself**

- **FR-028**: *(withdrawn 2026-08-09 — see Revisions.)* Formerly: the deployed
  site MUST serve a placeholder page containing no gameplay.
- **FR-029**: The deployed site MUST be readable on a phone-width screen
  without horizontal scrolling. *(Amended 2026-08-09: was scoped to the
  placeholder page, which no longer exists. The obligation was never about
  the placeholder — see Revisions.)*

**Offline**

- **FR-030**: After one visit with a network connection, the site MUST load with
  no network connection at all.
- **FR-031**: When a network is available, a visit MUST obtain the most recently
  published version. A cached copy MUST NOT pin a visitor to an old version.
- **FR-032**: Offline capability MUST work at whatever path the site is served
  from, so a preview behaves the same way production does.

**Test and lint foundations**

- **FR-033**: An automated test suite MUST exist, MUST drive a real browser, and
  MUST run against a locally served build of the site. It MUST NOT require a
  deployment to have succeeded, so that a failing test and a failing deployment
  remain distinguishable.
- **FR-034**: At least one smoke test MUST run against the pull request's
  deployed preview and confirm the page renders there. This is what makes the
  deployment verified rather than merely reported as successful.
- **FR-035**: Linting MUST run across the repository's own source.
- **FR-036**: Every reference to a requirement, edge case, or success criterion
  inside a feature's documents MUST resolve to something that feature's spec
  defines. A reference that does not resolve MUST fail the checks.

  This exists because inserting a requirement renumbers everything below it,
  silently invalidating references in the plan, the tasks, and the contracts. It
  happened in this feature and again in feature 002, where eight tasks cited
  unrelated requirements. It cannot verify that a citation names the *right*
  requirement — only that it names a real one, which is the difference between
  catching rot and catching error.

- **FR-042**: A pull request that changes the constitution alongside any other
  file MUST fail the checks. Governance requires an amendment be alone in its
  pull request, and constitution 3.1.0 makes that a property of the diff rather
  than of intent.

  The check MUST run regardless of what else changed. A constitution-only pull
  request alters nothing executable, so a check that only runs when code changes
  would skip exactly the pull requests it guards.

**Process record**

- **FR-037**: A pull request MUST prompt its author for the `## SDD Notes`
  section required by the project's definition of done.

**Cost control**

- **FR-038**: Hosting MUST be built from services billed by usage. Any component
  carrying a fixed recurring charge, or billed for time rather than for use, MUST
  be justified in the plan before it is adopted. An idle deployment — including
  one orphaned by a failed removal — MUST cost approximately nothing.
- **FR-039**: A spending threshold MUST be configured, and crossing it MUST
  notify the project owner. This is the backstop for cost that accrues without
  any job failing, which no other requirement here would detect.
- **FR-040**: The spending threshold MUST be scoped to the resources this project
  creates, not to the whole account. An account-wide threshold answers a
  different question: it alarms on unrelated spending and, more damagingly, it
  cannot distinguish this project's cost from anything else, so a genuine leak
  here could sit under the threshold indefinitely while looking fine.
- **FR-041**: Every resource this project creates MUST be identifiable as
  belonging to it, so that its cost can be attributed. Cost cannot be attributed
  by who created a resource, only by the resource itself — which is why this is a
  requirement about resources rather than about credentials.

### Key Entities

- **Pull request deployment**: A running copy of the site built from one pull
  request's branch. Created when the pull request opens, updated as commits
  arrive, removed when the pull request merges or closes. Has an address a
  contributor can open, and belongs to exactly one pull request.
- **Merge requirement**: A condition that must hold before a pull request can
  merge. Reports pass or fail, and identifies itself when it fails. The set of
  requirements is expected to grow over the life of the project.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A contributor can load a working copy of their change within 10
  minutes of opening a pull request, without performing any manual deployment
  step.
- **SC-002**: 100% of open pull requests have a reachable deployment.
- **SC-003**: No deployment resources from a merged or closed pull request remain
  more than 1 hour after it closed.
- **SC-004**: When no pull requests are open, ongoing cost attributable to
  pull-request deployments is zero. The permanent deployment is excluded.
- **SC-005**: The site is reachable at its permanent address, and every merge to
  `main` is reflected there with no manual step. No time bound is set: the
  publish path is not on anyone's critical path, and a number chosen without
  measurement would only invite argument later.
- **SC-006**: The steps that produce a pull request deployment and the permanent
  deployment are the same, differing only in whether a removal step runs.
- **SC-007**: 0% of pull requests failing a merge requirement can be merged.
- **SC-008**: A contributor can determine why a pull request is blocked from the
  pull request alone, without inspecting logs or asking anyone.
- **SC-009**: Two pull requests open at once never affect each other's
  deployment, verified by loading both and confirming each shows only its own
  content.
- **SC-010**: Loading the permanent address repeatedly throughout a publish
  never returns an error and never returns a page assembled from more than one
  version.
- **SC-011**: With the site loaded once and the network then disabled, reloading
  still renders the page.
- **SC-012**: With the network restored after a new version is published, the
  next reload shows the new version rather than the cached one.

## Assumptions

- **The contributor is the user.** This feature delivers no player-facing value;
  its success is measured by the experience of proposing and landing a change.
- **Single contributor.** The project has one contributor, so contributions from
  forks, review approvals, and multi-reviewer workflows are out of scope.

  This assumption weakened on 2026-08-08, when the repository was made public so
  that branch protection would be available — GitHub gates it behind a paid plan
  for private repositories. Anyone may now fork and open a pull request. The
  pipeline is safe by default rather than by design: GitHub withholds
  `id-token: write` from fork pull requests, so a fork cannot obtain AWS
  credentials and its preview deploy simply fails. That is the correct outcome
  and an unhelpful experience. Handling outside contributions properly is
  deferred until there are any.
- **Hosting platform is inherited, not chosen here.** The project constitution
  fixes per-pull-request environments to AWS. Which services and which
  infrastructure tooling implement that is a planning decision, not a
  specification one.
- **This feature runs under the constitution's bootstrap period.** Its own pull
  request cannot satisfy the merge requirements it creates. Each requirement
  becomes binding as it comes online, and the bootstrap period closes by a
  separate constitutional amendment once all are enforced.
- **"Publicly reachable" does not require a custom domain.** A stable address
  provided by the hosting platform satisfies this feature. Choosing and
  configuring a domain name is deferred.
- **Offline support is built here, minimally.** Deferring it was the original
  intent, but constitution Principle IV states the site MUST load without a
  network after a first visit, and the bootstrap clause relaxes only the merge
  checks — it does not relax a principle. Rather than ship a site in violation,
  this feature includes the smallest offline capability that satisfies the
  principle: cache what has been fetched, serve it when the network is gone.
  Nothing about puzzles, saved games, or rulesets is in scope, because none of
  them exist.
- **Spending protection is in scope; application monitoring is not.** A budget
  threshold and its notification are required (FR-039). Uptime monitoring,
  metrics, dashboards, and alerting on the site's behaviour are not.
- **Out of scope**: custom domain names, application monitoring and alerting,
  rollback
  tooling, release approval steps, and any gameplay whatsoever.
- **The placeholder page is temporary.** It exists to prove the pipeline delivers
  something loadable, and is expected to be replaced entirely by the first
  gameplay feature. No effort is spent on its design.
- **`## SDD Notes` is prompted, not policed.** A pull request template can put the
  heading in front of the author; verifying that its content is meaningful is a
  human judgment and is not automated.

## Clarifications

### Session 2026-08-07

- Q: When a deployment or teardown fails, where does that failure get reported so
  someone actually sees it? → A: Reported on the pull request itself, including
  after it has closed, with the owner notified automatically by subscription.
  Failures that prevent reporting at all must still reach the owner.
- Q: Should a pull request's preview deployment be reachable by anyone with the
  URL, or restricted? → A: Public. No authentication layer in front of previews.
- Q: Should this feature include a guard against runaway AWS spending? → A: Yes —
  a budget threshold that notifies the owner, plus a requirement that hosting be
  built from usage-billed services so idle cost is negligible by construction.
- Q: Should browser tests run against the deployed preview or a locally served
  build? → A: Full suite against a local build so it stays fast and independent
  of deployment, plus one smoke test against the deployed preview.
- Q: While a merge is being published, may the public site be briefly unavailable
  or serve a mix of old and new files? → A: Neither is acceptable. Publishing
  must be atomic to a visitor, previous-version files must stay retrievable for
  in-flight visits, and a failed publish must leave the old version serving.
- Q: Does "isolated environment" require infrastructure per pull request? → A: No.
  Previews must be independent to anyone loading them but may share
  infrastructure with each other. Production must have its own infrastructure and
  credentials, so unmerged code cannot reach it. Constitution amended to 2.0.0;
  recorded as FR-016 through FR-019.
- Q: `/speckit-analyze` found that deferring offline support conflicts with
  Principle IV, which the bootstrap clause does not relax. Build it or amend the
  principle? → A: Build a minimal service worker in this feature. Recorded as
  FR-030 through FR-032 and SC-011, SC-012.

**2026-08-07** — Both open questions resolved:

- **Public deployment is in scope.** `main` publishes to a permanent address,
  produced by the same process as a pull request deployment and differing only in
  that it is never torn down. Recorded as User Story 3 and FR-013 through FR-018.
- **Offline support is deferred but must not be designed out.** It arrives with
  gameplay. The plan must show it remains reachable — chiefly by not addressing
  deployments in a way that confines offline caching to a sub-path. Recorded in
  Assumptions.

## Revisions

Changes made after this specification settled, per constitution 3.2.0. Identifiers
are permanent; nothing here was renumbered.

**2026-08-08 — offline built rather than deferred.** FR-030 to FR-032 added.
`/speckit-analyze` found that deferring offline conflicted with Principle IV,
which the bootstrap clause did not relax. The choice was to build a minimal
service worker or ship in violation.

**2026-08-08 — production isolated from previews.** FR-017 rewritten; FR-018 and
FR-019 added. Planning surfaced that "each pull request deploys its own isolated
environment" married two concerns: what a visitor observes, and what a mistake
can reach. Constitution amended to 2.0.0 in the same session.

**2026-08-08 — "long enough" replaced.** FR-021 had required previous-version
files remain retrievable "for long enough", which no test could check. Restated
as: a publish never deletes them.

**2026-08-08 — the publish time bound removed.** SC-005 had bounded production
freshness at ten minutes, unmeasured and off anyone's critical path. The bound on
previews (SC-001) was kept, because a contributor waits on it.

**2026-08-08 — the URL must work as typed.** FR-002 extended and an edge case
added, after `/pr-2` served the right document at the wrong address and rendered
unstyled. Serving correct content at an incorrect address is a failure that looks
like a success.

**2026-08-09 — specification-only changes skip the code checks.** FR-013 and
FR-014 added. The mergeability clause is part of the requirement: a required
check that never reports blocks a pull request permanently.

**2026-08-09 — the spending threshold scoped to this project.** FR-040 and FR-041
added. An account-wide budget could not distinguish this project's cost from
anything else, so a leak here could sit under the threshold indefinitely.

**2026-08-09 — citations must resolve.** FR-036 added, after renumbering left
eight of feature 002's tasks citing unrelated requirements.

**2026-08-09 — amendment isolation enforced.** FR-042 added. Constitution 3.1.0
required the check and named it as work it did not do; this is that work.

**2026-08-09 — FR-042 renumbered before merge.** The amendment-isolation
requirement was first written as FR-037, colliding with the existing requirement
for prompting `## SDD Notes`. Two requirements shared an identifier, making any
citation to it ambiguous. Corrected to the next free number, which is what
constitution 3.2.0's append rule requires.

**2026-08-09 — the placeholder was superseded by feature 002.** FR-028 withdrawn
in place; FR-029 amended. This spec required the deployed site to serve a
placeholder page containing no gameplay, and its own Assumptions anticipated the
end of it: "the placeholder page is temporary... expected to be replaced entirely
by the first gameplay feature."

That feature has arrived, so the requirement is now false rather than merely
finished. It is withdrawn rather than deleted, per constitution 3.2.0, so its
identifier stays permanently taken and this entry explains why the pipeline once
demanded an empty page.

FR-029 survives with its scope widened: being readable at phone width was never
a property of the placeholder, only stated through it.
