# Quickstart: Validating the Delivery Pipeline

**Feature**: 001-delivery-pipeline
**Date**: 2026-08-07

How to prove this feature works. Each scenario maps to acceptance criteria in
[spec.md](./spec.md); the mechanisms they exercise are described in
[contracts/deployment.md](./contracts/deployment.md).

## Prerequisites

- Node.js 22 LTS
- An AWS account, with credentials able to run CDK locally
- The GitHub repository, with Actions enabled
- **GitHub workflow-failure notifications enabled** for your account — this is
  the one part of FR-022 that no code can guarantee

## One-time setup

```bash
npm install
npm run infra:deploy        # provisions both stacks and the budget
```

Each stack reports its distribution domain as an output — one for production, one
for previews. They are different hosts, and that is the point: the stacks share
no resources.

The domains are deliberately not written down in this repository. They are
properties of a deployment, not of the project, so the deployment is their only
source of truth. To recover them at any time:

```bash
npm run infra:outputs       # prints each stack's distribution domain
```

Every URL below is relative to whichever of the two applies.

Then, in repository settings, require these checks before merging: branch current
with `main`, lint, browser suite, preview deploy, preview smoke test. Disallow
direct pushes to `main` and set merging to squash-only.

## Local development

```bash
npm run dev                 # site at localhost, hot reload
npm run build               # production build into site/dist
npm run preview             # serve the built output locally
npm run lint
npm run test:e2e            # Playwright against a locally served build
```

---

## Scenario 1 — A preview appears and updates (US1)

1. Branch, change visible text on the placeholder page, push, open a pull request.
2. **Expect** within 10 minutes: a comment carrying a `pr-<number>/` URL (SC-001).
3. Open it on a desktop browser and on a phone. **Expect** your change, not
   `main`'s content (FR-001, FR-004).
4. Push a second commit. **Expect** the same URL to serve the newer content, and
   the existing comment to be updated rather than a second one added (FR-003, C5).

**Also verify isolation**: with a second pull request open simultaneously, load
both URLs and confirm each shows only its own content (SC-009).

## Scenario 2 — Broken work cannot merge (US2)

Run these as separate throwaway pull requests:

| Introduce | Expect |
|---|---|
| A lint error | Merge blocked, lint named as the failure (FR-006, FR-009) |
| A failing browser test | Merge blocked, tests named |
| A branch behind `main` | Merge blocked until updated (FR-005) |
| Nothing — a clean pull request | Merge available; lands as a single commit (FR-011) |

Then attempt to push directly to `main`. **Expect** rejection (FR-010).

## Scenario 3 — Publishing is atomic (US3, FR-018)

This is the scenario worth performing carefully, because the failure it guards
against is invisible in normal use.

1. Open the production URL and leave the tab open.
2. Merge a pull request that changes both the page text and its styling.
3. **While the deploy runs**, reload repeatedly.

**Expect**: every load returns either the complete old version or the complete
new version. Never an error, never new text with old styling (SC-010).

4. In the tab you left open from step 1, confirm the page's existing assets still
   load — the previous version's files were not deleted (FR-019).

**If this fails**, the ordering in C3 was not honoured: `index.html` was written
before the assets it references, or assets were overwritten rather than added.

## Scenario 3b — Production is unreachable from a pull request (FR-015)

The guarantee that unmerged code cannot touch the published site. Worth testing
deliberately, because it is the kind of protection people assume they have.

1. On a throwaway branch, edit the preview workflow to attempt a write to
   **production's** bucket — assume the preview role and target the production
   bucket name directly.
2. Open a pull request and let it run.
3. **Expect**: the step fails with an access denied error from AWS. Not a
   workflow guard, not a name check — a refusal from the credential itself.
4. Now edit the workflow to attempt assuming the **production role**.
5. **Expect**: the role assumption is rejected. A pull request's OIDC token
   carries a subject the production role's trust policy does not admit.

If either step succeeds, FR-015 is not satisfied, and no amount of care in the
workflow files will substitute.

## Scenario 3c — The site works offline (FR-027 to FR-029)

Satisfies constitution Principle IV. Worth doing by hand at least once, since the
automated version can only simulate losing a network.

1. Load the site with a network connection and let it finish.
2. Turn off wifi, or use the browser's offline mode.
3. Reload. **Expect** the page still renders (SC-011).
4. Restore the network, publish a new version, and reload. **Expect** the new
   version, not the cached one (SC-012).
5. Repeat steps 1–3 against a **preview** URL. **Expect** identical behaviour —
   this is what confirms the worker's scope follows the deployment prefix
   (FR-029).

## Scenario 4 — Nothing is left behind (US4)

1. Note an open pull request's preview URL.
2. Close the pull request without merging.
3. **Expect**: the URL stops serving the site, and no objects remain under that
   prefix (FR-016, SC-003).
4. **Expect**: the production URL is unaffected (FR-016).
5. Reopen the pull request. **Expect** the preview returns at the same address.

## Scenario 5 — Failures are seen (FR-020 to FR-022)

1. Temporarily break the teardown workflow — for example, point it at a
   nonexistent prefix in a way that errors.
2. Close a pull request to trigger it.
3. **Expect**: a comment on the now-closed pull request naming the failure, and
   an email notification without you having gone looking (C5).
4. Now break the workflow so it fails to start at all — malformed YAML.
5. **Expect**: a workflow-failure notification from GitHub itself. This is the
   account setting from the prerequisites; if no email arrives, FR-022 is not
   satisfied and no code change will fix it.

## Scenario 6 — Cost is bounded (FR-028, FR-029)

1. Confirm the budget exists and its threshold notifies your email address.
2. With no pull requests open, confirm the only remaining resources are the
   bucket, the distribution, and production's objects.
3. Sanity-check the bill after a week of use. **Expect** cents, not dollars — if
   not, something with a fixed or hourly charge was introduced, contrary to
   FR-029.

---

## Definition of done for this feature

Beyond the scenarios above, per the constitution:

- All required checks green on the pull request
- `spec.md`, `plan.md`, and `tasks.md` current with what was built
- A human-written `## SDD Notes` section in the pull request body
- A follow-up pull request amending the constitution to close the bootstrap
  period — **alone in its own pull request**, as Governance requires
