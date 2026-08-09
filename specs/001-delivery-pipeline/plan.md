# Implementation Plan: Delivery Pipeline

**Branch**: `001-delivery-pipeline` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-delivery-pipeline/spec.md`

## Summary

Build the path a change travels from pull request to `main`, delivering a
placeholder page with no gameplay.

Two independent stacks. Production has its own bucket and distribution, serving
the site at that distribution's root. Previews share a second bucket and
distribution among themselves, each pull request under a `pr-<number>/` prefix.
The two are reached by different CI roles, and the production role cannot be
assumed by a workflow running from any branch other than `main` — so unmerged
code cannot touch the published site even if it rewrites its own workflow.
Deployments upload files only — infrastructure is provisioned by hand and never
touched by a routine deploy. Publishing is atomic because assets are content-hashed and
immutable and `index.html` is written last, so old and new versions coexist and
no visitor ever assembles a page from both. Teardown deletes a prefix. GitHub
Actions runs lint, a Playwright suite against a locally served build, and a smoke
test against the deployed preview, then gates merging on all of them.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS

**Primary Dependencies**: Vite (build), Playwright (browser tests), ESLint +
Prettier (lint), AWS CDK v2 (infrastructure)

**Storage**: Amazon S3 — static assets only. No database; Principle IV forbids one.

**Testing**: Playwright driving Chromium and WebKit, plus a mobile viewport.
No unit test framework is installed, per Principle VIII.

**Target Platform**: Current evergreen browsers, desktop and mobile. WebKit is
the practical floor, since every iOS browser uses it.

**Project Type**: Static web application plus its delivery infrastructure

**Performance Goals**: Preview reachable within 10 minutes of opening a pull
request (SC-001); production reflects a merge within 10 minutes (SC-005)

**Constraints**: No application backend (Principle IV). Usage-billed services
only, negligible idle cost (FR-029). Publishing atomic to a visitor (FR-018).
Build artifact must be position-independent so previews and production deploy
identical output (FR-014).

**Scale/Scope**: One contributor, one or two concurrent pull requests, a
placeholder page of a few kilobytes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Verdict | Notes |
|---|---|---|
| I. Every Change Traces to a Spec | **Pass** | This plan implements spec 001. Infrastructure is treated as a feature, as the constitution requires |
| II. Exactly One Solution | N/A | No puzzles exist yet |
| III. Rulesets Are Additive | **Pass — not precluded** | No engine code is written. The build emits a plain static bundle that imposes nothing on a later constraint engine |
| IV. No Backend, Works Offline | **Pass** | Static assets only; no server, no database. Offline is satisfied by a minimal service worker (D8), added after `/speckit-analyze` found that deferring it conflicted with this principle and that the bootstrap clause does not relax principles |
| V. Links and Saved State Never Break | N/A | No links or saved state yet |
| VI. Progress Persists Locally | N/A | Nothing to persist |
| VII. Generation Stays Responsive | N/A | No generation |
| VIII. Every Test Is Something a Player Could Do | **Pass** | Every test loads a page in a real browser and asserts what a person would see. No unit test framework is installed, so the rule is enforced by absence rather than discipline |
| IX. Playable by Keyboard, Mouse, and Touch | **Pass, trivially** | The placeholder page has no interaction. FR-024 keeps it readable at phone width |
| Scope and Technology Bounds | **Pass** | English only; evergreen browsers targeted deliberately; nothing here precludes curated libraries, authored puzzles, or player-defined rulesets |
| Development Workflow | **Pass under bootstrap** | This feature creates the checks it will later be gated by. The bootstrap clause covers exactly this |

### Resolved: environment isolation

Constitution 1.0.0 required each pull request to "deploy its own isolated AWS
environment." Planning surfaced that this married two separate concerns, and the
owner amended it to **2.0.0** to separate them:

- **What an observer sees.** Every preview is a complete, standalone site,
  unaffected by any other pull request. Satisfied by a dedicated key prefix — no
  per-pull-request infrastructure needed.
- **What a mistake can reach.** Production runs on its own bucket, its own
  distribution, and its own credentials. Preview infrastructure and production
  infrastructure share nothing.

This plan implements the amended rule. The second concern is enforced by the
OIDC trust policy rather than by convention: the production role names
`ref:refs/heads/main` as the only subject permitted to assume it, so a workflow
running from a pull request branch cannot assume it — even if that pull request
edits the workflow file to try.

## Project Structure

### Documentation (this feature)

```text
specs/001-delivery-pipeline/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output — D1 through D7
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── deployment.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Created by /speckit-tasks, not by this command
```

### Source Code (repository root)

```text
site/                        # The web application (Vite root)
├── index.html               # Entry point; the only mutable deployed file
├── public/
│   └── sw.js                # Service worker, copied verbatim by Vite
├── src/
│   ├── main.ts              # Registers sw.js with a relative path
│   └── style.css
└── vite.config.ts           # base: './' — position-independent output

tests/
└── e2e/
    ├── placeholder.spec.ts  # Runs against a locally served build
    ├── offline.spec.ts      # Loads, disconnects, reloads
    └── smoke.spec.ts        # Runs against a deployed URL

scripts/                     # Deployment procedure, invoked by workflows
├── deploy.ts                # Ordered upload per contracts/deployment.md C3
└── teardown.ts              # Prefix deletion per C4

infra/                       # AWS CDK app — applied by hand, never by CI deploys
├── bin/infra.ts             # Instantiates both stacks plus the account budget
├── lib/
│   ├── site-stack.ts        # Reusable: bucket + distribution + deploy role
│   ├── github-oidc.ts       # The one necessarily shared resource; see below
│   └── budget.ts            # Account-wide spending threshold
└── cdk.json

.github/
├── actions/                 # Reusable composite actions
│   ├── report/action.yml    # Failure reporting, per contract C5
│   └── comment/action.yml   # Upserting preview-URL comment
├── workflows/
│   ├── checks.yml           # Lint and the local browser suite
│   ├── deploy-preview.yml   # Publish pr-<n>/, smoke test, comment the URL
│   ├── deploy-production.yml# Publish to root on merge to main
│   └── teardown-preview.yml # Delete pr-<n>/ on close, comment the outcome
└── pull_request_template.md # Carries the required "## SDD Notes" heading

playwright.config.ts
eslint.config.js
package.json
```

**Structure Decision**: Three top-level concerns, separated because they have
different lifecycles: `site/` changes constantly, `tests/` changes with it, and
`infra/` changes almost never. That separation is the structural expression of
D3 — routine deployments touch `site/` output only, so a content change cannot
alter the distribution.

**One resource is necessarily shared**, and it was not anticipated when this plan
was written: AWS permits a single OIDC identity provider per issuer URL per
account, so production and previews cannot each have their own. This does not
weaken FR-016. A provider grants nothing by itself; what separates the two is the
trust condition on each role, and those are verifiably distinct in the
synthesized templates — production admits only `ref:refs/heads/main`.

`site-stack.ts` is instantiated twice, once for production and once for previews.
The two stacks are identical in shape and independent in resources, which is what
makes FR-014 honest: production is deployed by the same procedure precisely
because it runs on the same kind of stack, not a bespoke one.

## Deferred Decisions

Recorded so they are choices rather than oversights:

- **Old asset retention.** FR-019 now requires that a publish never delete a
  previous version's files, so they accumulate without bound by design rather
  than by omission. At a few hundred kilobytes per deployment this is years from
  mattering, and storage is billed by usage. No cleanup is built here; when one
  is eventually wanted, it will need its own spec and must not violate FR-019 —
  meaning it can only remove versions old enough that no browser could still
  hold a reference.
- **Custom domain.** Out of scope by the spec. The site will be reachable at its
  CloudFront address.
- **Concurrency limit on previews.** None imposed. With one contributor and
  usage-billed storage, an upper bound would be machinery without a problem.

## Complexity Tracking

> No constitution violations requiring justification.

The one item needing owner confirmation — whether a key prefix constitutes an
"isolated AWS environment" — is an interpretation question, recorded in the
Constitution Check above rather than as a violation. If the owner reads the
constitution strictly, this table gains an entry and the design changes; it is
not being justified away here.
