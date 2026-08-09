---

description: "Task list for feature 001: Delivery Pipeline"
---

# Tasks: Delivery Pipeline

**Input**: Design documents from `/specs/001-delivery-pipeline/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/deployment.md, quickstart.md

**Tests**: Test tasks are included and are **not optional here**. FR-033 and FR-034
require a browser suite and a deployed smoke test, and constitution Principle VIII
makes browser tests the only permitted kind. No unit test tasks appear anywhere in
this list, and none may be added without a constitutional amendment.

**Organization**: Grouped by user story so each is independently implementable and
testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths are given in every task

## Path Conventions

Per plan.md: `site/` is the Vite application, `tests/e2e/` the Playwright suite,
`infra/` the CDK app, `scripts/` the deploy and teardown implementations, and
`.github/` the workflows. All paths are relative to the repository root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Repository scaffolding and the placeholder site itself

- [X] T001 Create directory structure `site/src/`, `tests/e2e/`, `infra/lib/`, `infra/bin/`, `scripts/`, `.github/workflows/` per plan.md
- [X] T002 Initialize Node project in `package.json` targeting Node 22 with TypeScript 5.x
- [X] T003 [P] Configure TypeScript compiler options in `tsconfig.json`
- [X] T004 [P] Configure ESLint flat config in `eslint.config.js`
- [X] T005 [P] Configure Prettier in `.prettierrc.json`
- [X] T006 Configure Vite in `site/vite.config.ts` with `base: './'` so the build is position-independent (research.md D5)
- [X] T007 Create the placeholder page in `site/index.html` with no gameplay (FR-028)
- [X] T008 [P] Create placeholder styles in `site/src/style.css`, readable at 320px width without horizontal scrolling (FR-029)
- [X] T009 [P] Create the site entry module in `site/src/main.ts`
- [X] T010 Configure Playwright in `playwright.config.ts` for Chromium, WebKit, and a mobile viewport, serving the built output locally (research.md D6)
- [X] T011 Implement the service worker in `site/public/sw.js` — network-first for navigation, cache-first for hashed assets, cache what succeeds, discard caches from older versions (FR-030, FR-031, research.md D8)
- [X] T012 Register the service worker from `site/src/main.ts` using a relative path so its scope follows the deployment prefix (FR-032)
- [X] T013 Write the offline browser test in `tests/e2e/offline.spec.ts` — load the page, disable the network, reload, assert it still renders (SC-011)
- [X] T014 Write the cache-refresh browser test in `tests/e2e/offline.spec.ts` — with a network available after a new version publishes, assert the reload shows the new version (SC-012)
- [X] T015 [P] Create `.github/pull_request_template.md` containing the exact heading `## SDD Notes` and the two definition-of-done questions (FR-036, contract C6)
- [X] T016 [P] Add `.gitignore` entries for `node_modules/`, `site/dist/`, `infra/cdk.out/`, and Playwright artifacts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The infrastructure and the deploy procedure that every user story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. US1 and US3 both invoke the deploy script; US4 invokes teardown.

- [X] T017 Initialize the CDK app in `infra/cdk.json` and `infra/bin/infra.ts`
- [X] T018 Implement the reusable site stack in `infra/lib/site-stack.ts` — private bucket behind CloudFront Origin Access Control, distribution serving anonymously with no authentication in front of it, and a deploy role (FR-005; AWS defaults to private, so public read is configured, not inherited)
- [X] T019 Add the GitHub OIDC provider and per-stack trust conditions in `infra/lib/site-stack.ts`: previews trusted for `pull_request`, production trusted only for `ref:refs/heads/main` (FR-018, research.md D7)
- [X] T020 Set object cache headers in `scripts/deploy.ts` — `no-cache` for `index.html` and `sw.js`, one-year immutable for hashed assets (contract C2). Planned for `infra/lib/site-stack.ts`, but Cache-Control is a property of each uploaded object, not of the bucket or distribution
- [X] T021 Instantiate the production stack and the preview stack in `infra/bin/infra.ts` with no shared resources (FR-018, FR-019)
- [X] T022 [P] Implement the account spending threshold in `infra/lib/budget.ts` with owner notification (FR-038)
- [X] T023 Apply a `Project: sucopeku` tag to every resource in `infra/bin/infra.ts` so this project's cost is attributable (FR-040, research.md D13)
- [X] T024 Filter the budget in `infra/lib/budget.ts` to `TagKeyValue: user:Project$sucopeku` and lower the threshold to $1 (FR-039, research.md D13)
- [ ] T025 Activate `Project` as a cost allocation tag, **after T024 is merged and the tagged stacks are deployed**. AWS only offers tag keys it has already observed on resources, so activating before deployment fails with `Tag keys not found: Project`. Discovery is asynchronous and can take up to ~24 hours after the first tagged resource exists; activation then takes up to ~24 hours more and is not retroactive. Run `aws ce update-cost-allocation-tags-status --cost-allocation-tags-status TagKey=Project,Status=Active`, or check availability first with `aws ce list-cost-allocation-tags --status Inactive`. No code can do this (FR-039)
- [X] T026 Implement the ordered deploy in `scripts/deploy.ts` — upload hashed assets, verify, then write `index.html`, then invalidate that one path (contract C3, FR-020)
- [X] T027 Implement prefix deletion in `scripts/teardown.ts`, idempotent and scoped to the preview bucket (contract C4)
- [X] T028 [P] Create the reusable failure-reporting composite action in `.github/actions/report/action.yml` that comments on a pull request, including a closed one (FR-025, FR-026, contract C5)
- [X] T029 Add `build`, `lint`, `test:e2e`, `infra:deploy`, `infra:outputs`, `deploy`, and `teardown` scripts to `package.json`
- [X] T030 Declare the distribution domain as a stack output in `infra/lib/site-stack.ts`, so each deployment reports its own address and none is written down anywhere
- [X] T031 Deploy both stacks by hand with `npm run infra:deploy` and confirm each reports its distribution domain as an output

**Checkpoint**: Infrastructure exists, the deploy procedure is implemented, and both environments are reachable. User story work can begin.

---

## Phase 3: User Story 1 - See a change running before merging it (Priority: P1) 🎯 MVP

**Goal**: Opening a pull request produces a working, independently reachable copy of the site at a stable address.

**Independent Test**: Open a pull request that changes visible text, wait for the comment carrying a `pr-<number>/` URL, load it, and see the change. Push a second commit and see the same URL update.

- [X] T032 [US1] Create the preview deploy workflow in `.github/workflows/deploy-preview.yml`, triggered on pull request `opened`, `synchronize`, and `reopened` — all three named explicitly, since omitting `reopened` silently breaks the reopen edge case
- [X] T033 [US1] Add a per-pull-request concurrency group with `cancel-in-progress: true` to `.github/workflows/deploy-preview.yml`, so rapid pushes cannot land out of order (spec Edge Cases; safe per contract C3)
- [X] T034 [US1] Assume the preview deploy role via OIDC in `.github/workflows/deploy-preview.yml` (no stored AWS keys)
- [X] T035 [US1] Build the site and invoke `scripts/deploy.ts` with prefix `pr-<number>/` against the preview bucket in `.github/workflows/deploy-preview.yml` (FR-001, FR-003)
- [X] T036 [P] [US1] Implement the upserting preview-URL comment in `.github/actions/comment/action.yml`, editing the existing comment rather than appending (FR-002, contract C5)
- [X] T037 [P] [US1] Write the deployed smoke test in `tests/e2e/smoke.spec.ts`, taking its target URL from an environment variable (FR-034)
- [X] T038 [US1] Run the smoke test against the freshly deployed preview in `.github/workflows/deploy-preview.yml`
- [X] T039 [US1] Report preview deploy failures through `.github/actions/report/action.yml` in `.github/workflows/deploy-preview.yml`
- [X] T040 [US1] Validate quickstart Scenario 1, including two simultaneous pull requests showing only their own content (SC-001, SC-002, SC-009) — verified: pr-6 and pr-7 served distinct markers, neither contained the other's, production carried neither

**Checkpoint**: Previews work end to end. This is the MVP — every later story gates on, publishes from, or cleans up what exists now.

---

## Phase 4: User Story 2 - Broken work cannot reach main (Priority: P2)

**Goal**: A pull request that fails lint, tests, deployment, or currency with `main` cannot be merged, and says why.

**Independent Test**: Open a pull request with a deliberate lint error; confirm merge is blocked and lint is named. Fix it; confirm merge becomes available.

- [X] T041 [P] [US2] Write the placeholder page browser test in `tests/e2e/placeholder.spec.ts`, running against the locally served build and not depending on any deployment (FR-033)
- [X] T042 [US2] Create the checks workflow running lint and the local browser suite in `.github/workflows/checks.yml`
- [X] T043 Verify every requirement citation in `specs/**` resolves, via `scripts/check-spec-citations.ts` wired into `npm run lint` (FR-036)
- [X] T044 [US2] Add a `scope` job to `.github/workflows/checks.yml`, `.github/workflows/deploy-preview.yml`, and `.github/workflows/deploy-production.yml` that compares the pull request's base and head commits and reports whether anything outside `specs/`, `.specify/`, and `*.md` changed (FR-013, research.md D12)
- [X] T045 [US2] Make the working jobs conditional on `scope`, and add an always-running gate job named `checks` / `deploy` so the required status check always reports — a skipped required check leaves a pull request permanently unmergeable (FR-013). On `main` the publish is skipped instead, while linting and the browser suite still run unconditionally — FR-016 requires them after every merge (FR-014 covers the skipped publish) and makes no exception for documentation
- [X] T046 [US2] Report check failures through `.github/actions/report/action.yml` in `.github/workflows/checks.yml` (FR-010)
- [X] T047 [US2] Create a repository **ruleset** (not classic branch protection — see research.md D9) targeting `~DEFAULT_BRANCH` — require branch currency, lint, browser suite, preview deploy and smoke test; forbid direct pushes; allow squash merge only — following the setup steps in `specs/001-delivery-pipeline/quickstart.md` (FR-006 to FR-012). Also set squash-merge to use the PR title and body — without it the `## SDD Notes` section is discarded at merge and contract C6 silently fails. Applied in two stages: pull-request-required, linear history, no force pushes and no deletion can be set now; the `required_status_checks` rule naming `checks` and `deploy` MUST wait until those workflows exist on `main`, or every open pull request becomes permanently unmergeable. NOTE: rulesets require a public repository or a paid plan; the repository was made public on 2026-08-08 to unblock this.
- [X] T048 [US2] Validate quickstart Scenario 2, including the direct-push rejection (SC-007, SC-008) — verified: a lint error blocked the merge and the comment named it; removing it restored CLEAN; a direct push to main was rejected by the ruleset

**Checkpoint**: The gate is live. From here, this feature's own pull request is subject to the checks it created — the bootstrap period begins closing.

---

## Phase 5: User Story 3 - The site is publicly reachable (Priority: P3)

**Goal**: Merging to `main` publishes to production's own infrastructure, atomically, by the same procedure a preview uses.

**Independent Test**: Merge a change and confirm it appears at the production address, with the site never unavailable and never mixing versions during the publish.

- [X] T049 [US3] Create the production deploy workflow in `.github/workflows/deploy-production.yml` triggered on push to `main`
- [X] T050 [US3] Run linting and the browser suite on `main` inside `.github/workflows/deploy-production.yml`, and make the publish job depend on them passing so a failing `main` never reaches the public site (FR-016)
- [X] T051 [US3] Add a single-branch concurrency group with `cancel-in-progress: **false**` to `.github/workflows/deploy-production.yml`, so rapid merges queue and publish in order rather than racing or being cancelled mid-publish
- [X] T052 [US3] Assume the production deploy role via OIDC in `.github/workflows/deploy-production.yml` (FR-018)
- [X] T053 [US3] Build and invoke `scripts/deploy.ts` against the production bucket at the root prefix in `.github/workflows/deploy-production.yml`, using the identical ordered steps as the preview path (FR-017)
- [X] T054 [US3] Report publish failures through `.github/actions/report/action.yml` in `.github/workflows/deploy-production.yml`, leaving the previous version serving (FR-022)
- [X] T055 [US3] Validate quickstart Scenario 3 — reload repeatedly during a publish, confirming no error and no mixed version (SC-010) — accepted as validated by the owner
- [X] T056 [US3] Validate quickstart Scenario 3b — confirm a pull request workflow is refused both production's bucket and production's role (FR-018) — proven 2026-08-09 by a temporary workflow whose jobs passed only on refusal: the preview role got `AccessDenied` on `s3:PutObject` against production's bucket, and a pull-request token was refused `sts:AssumeRoleWithWebIdentity` for production's role. Both denials came from AWS, not from workflow logic

**Checkpoint**: Sucopeku is publicly reachable, and unmerged code provably cannot touch it.

---

## Phase 6: User Story 4 - Finished work leaves nothing behind (Priority: P4)

**Goal**: Closing or merging a pull request removes its preview and everything it created.

**Independent Test**: Note a preview URL, close the pull request, confirm the URL stops serving and no objects remain under its prefix — while production is unaffected.

- [X] T057 [US4] Create the teardown workflow in `.github/workflows/teardown-preview.yml` triggered on pull request close, whether merged or not
- [X] T058 [US4] Invoke `scripts/teardown.ts` for the pull request's prefix in `.github/workflows/teardown-preview.yml` (FR-023)
- [X] T059 [US4] Report teardown failures to the now-closed pull request through `.github/actions/report/action.yml` in `.github/workflows/teardown-preview.yml` (FR-024, FR-026)
- [X] T060 [US4] Validate quickstart Scenario 4, including reopening a pull request and confirming its preview returns at the same address (SC-003, SC-004) — verified: closing removed all 4 objects and left pr-6 untouched; reopening restored the preview at the same address

**Checkpoint**: All four stories complete. The pipeline creates, gates, publishes, and cleans up.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T061 [P] Enable GitHub workflow-failure notifications for the owner account, per the prerequisites in `specs/001-delivery-pipeline/quickstart.md` (FR-027 — the one requirement no code can satisfy) — done: workflow-failure notifications confirmed arriving
- [X] T062 Validate quickstart Scenario 5 — break teardown deliberately, confirm a comment on the closed pull request and an email arrive — accepted as validated by the owner
- [X] T063 Validate quickstart Scenario 6 — confirm the budget notifies, and that no resource with a fixed or hourly charge was introduced (FR-037) — accepted as validated by the owner
- [X] T064 Update `specs/001-delivery-pipeline/plan.md` and this file if anything built diverged from what was planned (constitution: artifacts must be current at merge) — verified 2026-08-09: the only divergence was `scripts/outputs.ts`, absent from the plan's file tree; added
- [X] T065 Write the human-authored `## SDD Notes` section in this feature's pull request body, answering both definition-of-done questions — done: notes written per pull request as the work proceeded, rather than once at the end
- [X] T066 Amend `.specify/memory/constitution.md` to close the bootstrap period — **in a separate pull request containing nothing else**, as Governance requires — done: constitution amended to v2.2.0 in its own pull request, recording that every required check is enforced and that the exemption was closed deliberately rather than allowed to lapse

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup. **Blocks every user story** — T023 (deploy) is used by US1 and US3, T024 (teardown) by US4, T025 (reporting) by all four
- **US1 (Phase 3)**: Depends on Foundational
- **US2 (Phase 4)**: Depends on Foundational. Its gating references the preview deploy check, so it is most useful after US1, but the lint and test checks work without it
- **US3 (Phase 5)**: Depends on Foundational only. Independent of US1 in code — it reuses the same deploy script against a different stack
- **US4 (Phase 6)**: Depends on Foundational. Needs a preview to exist to be meaningfully tested, so validate after US1
- **Polish (Phase 7)**: Depends on all stories

### Sequencing note specific to this feature

T046 (branch protection) makes the checks binding. Once it lands, this feature's own pull request is subject to gates that its later tasks are still building — which is precisely what the constitution's bootstrap clause exists for. Expect to merge some of Phase 5 and 6 under that exemption, and close it in T065.

### Parallel Opportunities

- T003, T004, T005 — three independent config files
- T008, T009, T015, T016 — separate files, no shared state
- T022 (budget) is independent of the site stacks and can proceed alongside T018–T021
- T025 (reporting action) can be built while the stacks deploy
- T033 and T034 — a composite action and a test file, unrelated
- Across stories: US3 and US4 touch different workflow files and could proceed in parallel with US2 once Foundational is done

---

## Parallel Example: Phase 1 Setup

```bash
# After T002 creates package.json, these three are independent:
Task: "Configure TypeScript compiler options in tsconfig.json"
Task: "Configure ESLint flat config in eslint.config.js"
Task: "Configure Prettier in .prettierrc.json"
```

## Parallel Example: User Story 1

```bash
# T033 and T034 touch unrelated files:
Task: "Implement the upserting preview-URL comment in .github/actions/comment/action.yml"
Task: "Write the deployed smoke test in tests/e2e/smoke.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1: Setup — a buildable placeholder site
2. Phase 2: Foundational — stacks deployed, deploy procedure implemented
3. Phase 3: US1 — previews appear on pull requests
4. **Stop and validate** against quickstart Scenario 1

At that point you can see your own changes running before merging them, which is
the single largest thing this feature delivers.

### Incremental Delivery

| Increment | Delivers |
|---|---|
| Setup + Foundational | Nothing user-visible; everything else depends on it |
| + US1 | Previews. **MVP** |
| + US2 | Broken work stops at the gate |
| + US3 | Sucopeku is publicly reachable |
| + US4 | Nothing accumulates |

### Solo Strategy

This project has one contributor, so the parallel markers indicate what is safe
to batch in a single sitting rather than what to distribute. The practical order
is Phase 1 → Phase 2 → US1 → US2 → US3 → US4 → Polish, stopping at each
checkpoint to run that story's quickstart scenario before moving on.

---

## Notes

- No unit test tasks appear in this list, by constitutional principle rather than by oversight
- Every test task drives a real browser and asserts what a person would see
- Commit after each task or logical group; the pull request is squash-merged, so granular commits cost nothing
- T065 must be its own pull request — Governance forbids bundling a constitutional amendment with anything else
