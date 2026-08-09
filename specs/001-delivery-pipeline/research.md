# Phase 0 Research: Delivery Pipeline

**Feature**: 001-delivery-pipeline
**Date**: 2026-08-07

Each decision below resolves an unknown in the plan's Technical Context.

---

## D1. How is each deployment addressed?

**Decision**: Two stacks of identical shape and no shared resources.

- **Production stack** — its own bucket and distribution. The site is served from
  that distribution's root.
- **Preview stack** — its own bucket and distribution, shared by all pull
  requests. Each pull request occupies a `pr-<number>/` key prefix.

No infrastructure is created or destroyed per pull request. Each stack has its
own CI deploy role; the production role's trust policy admits only
`ref:refs/heads/main`, so a workflow running from a pull request branch cannot
assume it regardless of what that branch's workflow file says.

This shape follows constitution 2.0.0, which separates observer-visible
independence (satisfied by prefixes) from blast radius (satisfied by separate
stacks and roles).

**Rationale**:

This was flagged during clarification as the most consequential decision in the
plan, on the grounds that a path-prefixed preview could not exercise offline
behaviour later. **That concern was overstated and is withdrawn.** A service
worker's default scope is the path it is served from, so a worker at
`/pr-42/sw.js` controls everything under `/pr-42/` — which is the entire
application, provided the site references its assets relatively rather than from
`/`. The scope limitation only bites when an app served from a sub-path assumes
it owns the origin root.

Two further facts make the concern moot in practice:

- The full browser suite runs against a **locally served build** (FR-025), where
  the site is at the origin root and a service worker behaves exactly as it will
  in production. Offline behaviour is therefore verified at root scope
  regardless of how previews are addressed.
- Production is served from the distribution root, so the production service
  worker is root-scoped in any case.

The requirement this creates is narrow and cheap: **the site must use relative
asset references**, so the identical build artifact works at any base path.

**Alternatives considered**:

| Alternative | Rejected because |
|---|---|
| A CloudFront distribution per pull request | Each distribution does provide a free unique `*.cloudfront.net` hostname, so no custom domain would be needed. But creating a distribution takes minutes, eating the SC-001 budget, and deleting one requires disabling it and waiting — often 15+ minutes — making teardown slow and failure-prone. It also makes every deployment an infrastructure change, contrary to D3. |
| A hostname per pull request via custom subdomains | Requires a registered domain and wildcard certificate. Custom domains are explicitly out of scope in the spec. |
| S3 website endpoints per bucket | Gives a unique hostname per bucket but serves over HTTP only. Service workers require HTTPS, so this forecloses offline support entirely. |

**Consequence for the spec**: satisfies FR-001 through FR-005, FR-015, and
FR-016. Each prefix holds a complete, independently loadable copy of the site,
reachable by anyone with the address, with no authentication layer; production
shares nothing with any of them.

**Note on production's URL**: with two distributions, production has a different
CloudFront domain from the preview host. That is invisible to visitors, who only
ever see production's address, and it removes any chance of a preview path
colliding with a production path.

---

## D2. How is publishing made atomic?

**Decision**: Assets are content-hashed and immutable. A deployment uploads every
asset first, then writes `index.html` last. Old assets are never overwritten or
deleted at deploy time. `index.html` is served with `no-cache`; hashed assets are
served with a one-year immutable cache lifetime. A CloudFront invalidation is
issued for `index.html` only.

**Rationale**: Because every asset filename contains a hash of its contents, a
new version's files never collide with the old version's. Both sets coexist, so a
visitor holding the old `index.html` continues to fetch the old assets
successfully — there is no window in which a mixed set can be assembled. The
single-file swap of `index.html` is the only mutating operation, and it either
happened or it did not.

If the upload fails partway, `index.html` is untouched and the previously
published version keeps serving, satisfying FR-020's requirement that a failed
publish leave the old version live.

This is the approach the project owner has used successfully before; it is
recorded here as the plan's choice rather than assumed by the spec.

**Alternatives considered**: blue/green with two prefixes and an origin-path
switch (more moving parts, and the origin path is an infrastructure change on
every deploy); versioned directory plus a redirect (adds a request hop and a
second mutable object).

**Consequence**: satisfies FR-018, FR-019, FR-020, SC-010.

**Follow-on this creates**: old assets accumulate. Nothing deletes them in this
feature. At the observed rate — a few hundred kilobytes per deployment — this is
years away from mattering, and a deliberate retention decision is deferred rather
than forgotten. Recorded in `plan.md` under Deferred Decisions.

---

## D3. Infrastructure as code, and what changes per deployment

**Decision**: AWS CDK in TypeScript, in `infra/`. One reusable stack definition is
instantiated twice — production and previews — each provisioning a bucket, a
distribution, and its own OIDC deploy role. A separate small construct creates
the account budget. It is applied rarely and by hand. **Routine deployments never
run it** — they upload files and issue an invalidation.

Because both environments come from the same stack definition, production is not
a special case that can drift from what every pull request exercises. The
difference between them is confined to two parameters: which prefix content lands
under, and which branch may assume the role.

**Rationale**: The project is TypeScript everywhere else, so CDK avoids a second
language and toolchain for a small amount of infrastructure. Keeping deployments
strictly file-based means a content change cannot break the distribution
configuration, and makes the deploy path fast and boring — which matters because
that path runs on every pull request.

**Alternatives considered**: Terraform (equally capable here; rejected only to
avoid a second language and a state backend to manage); raw CloudFormation
(verbose); console click-ops (not reproducible, and invisible to review).

### Why content deployments are not managed by CloudFormation

CDK offers `BucketDeployment`, a Lambda-backed custom resource that syncs a
directory to a bucket and can invalidate CloudFront paths. It is deliberately not
used for publishing content, for four reasons:

- **No ordering guarantee.** Atomic publishing (D2) requires `index.html` to land
  after every asset it references. `BucketDeployment` uploads a directory as one
  unit and does not order objects within it. Achieving the guarantee would take
  two deployments with an explicit dependency — two stack updates per publish, and
  more machinery than the script it replaces.
- **It prunes by default**, deleting destination objects absent from the source.
  Those are exactly the previous version's assets that FR-018 requires be kept.
  Correct behaviour is one flag away, which is one flag too close.
- **Every content change becomes a stack update**, bringing the CloudFormation
  stack lock, rollback semantics that make little sense for content, minutes
  instead of seconds, and a real cancellation hazard where none exists today.
- **It re-entangles two lifecycles this plan separates.** Content changes
  constantly; infrastructure almost never. Routing uploads through CloudFormation
  makes every text edit capable of touching the distribution.

The dividing line: **CloudFormation owns anything with a lifecycle** — bucket,
distribution, roles, budget. **The deploy script owns bytes in a bucket.**
Uploading a file is not a state transition needing reconciliation, and the two
mutations involved (`PutObject`, `CreateInvalidation`) are each atomic already.

**Accepted cost**: the upload logic — including the ordering that makes it
correct — is ours to maintain. It is roughly forty lines, specified by contract
C3 and exercised by quickstart Scenario 3.

### Standing constraint: cancellable workflows must never run CDK

Cancelling a GitHub Actions run kills the runner, not the AWS-side operation. A
cancelled `cdk deploy` leaves CloudFormation still executing with nothing polling
it, and the next run meets a stack in `UPDATE_IN_PROGRESS`.

This is why cancellation is safe today: the deploy workflows perform only object
writes and an invalidation. Any future change that puts `cdk deploy` inside a
workflow with `cancel-in-progress: true` inherits this hazard and MUST remove the
cancellation first.

**Note**: CDK bootstrap creates a small support stack. Its S3 storage is billed by
usage; the ECR repository it creates carries no fixed charge. This is consistent
with FR-029.

---

## D4. Hosting components and their billing model

**Decision**: S3 for storage, CloudFront for delivery, AWS Budgets for the
spending threshold, GitHub Actions for automation.

**Rationale**: FR-029 requires usage-billed components with negligible idle cost.
S3 bills per gigabyte-month and per request; CloudFront bills per gigabyte
transferred and per request, with no fixed distribution fee; AWS Budgets is free
for the first two budgets; CloudFront invalidations are free for the first 1,000
paths per month, and this design invalidates one path per deploy.

An idle deployment — including one orphaned by a failed teardown — costs only the
storage of a few hundred kilobytes, which is fractions of a cent per month. This
satisfies FR-029 by construction rather than by vigilance.

**Explicitly avoided**: NAT gateways, load balancers, provisioned capacity, and
hosted DNS zones — each carries a fixed or hourly charge and none is needed by a
static site.

---

## D5. Site build tooling

**Decision**: Vite with TypeScript, rooted at `site/`, configured with a relative
base path so the built artifact is position-independent.

**Rationale**: Vite emits content-hashed filenames by default, which D2 depends
on. Its relative-base mode produces output that works unchanged at the
distribution root or under a `pr-<number>/` prefix, so previews and production
deploy the identical artifact — satisfying FR-014's requirement that the two
processes differ only in lifetime.

**Alternatives considered**: hand-written HTML with no build step (would satisfy
this feature, but content hashing would have to be built by hand, and the site
becomes a real application shortly); a full framework (nothing to render yet, and
Principle II of the constitution asks for the least machinery that satisfies the
spec).

---

## D6. Browser test tooling

**Decision**: Playwright, running Chromium, WebKit, and a mobile viewport
emulation. The suite runs against a locally served production build. A separate,
minimal smoke test runs against a deployed URL supplied by environment variable.

**Rationale**: FR-025 requires the suite to run against a local build and to not
depend on a deployment; FR-026 requires one test against the real preview.
Playwright covers both from one toolchain and one test syntax, which keeps the
smoke test from being a second, differently-shaped thing.

WebKit matters more than usual here: Principle IX makes mobile first-class, and
on iOS every browser is Safari's engine, so WebKit is the real compatibility
floor for the project.

**Constitution note**: every test in this suite loads a page in a browser and
asserts what a person would see. No unit tests are introduced, consistent with
Principle VIII.

---

## D7. CI platform and AWS authentication

**Decision**: GitHub Actions, authenticating to AWS by OIDC federation. Two
roles, one per stack. No long-lived AWS access keys are stored.

| Role | Trust condition | May write to |
|---|---|---|
| Preview deploy | `repo:<owner>/<repo>:pull_request` | Preview bucket only |
| Production deploy | `repo:<owner>/<repo>:ref:refs/heads/main` | Production bucket only |

**Rationale**: OIDC removes stored credentials entirely and costs nothing. The
split roles are what make FR-015 enforceable rather than aspirational: a pull
request can edit its own workflow file, so the guarantee cannot rest on what the
workflow chooses to do. It has to rest on AWS refusing the role. Because the
production role's trust policy names the `main` ref as its only subject, a
workflow triggered by a pull request is issued a token AWS will not accept.

**Failure reporting** (FR-020 to FR-022): each workflow posts its outcome as a
pull request comment, including the teardown workflow, which comments on the
already-closed pull request. GitHub notifies subscribers of comments on closed
pull requests, and the author is subscribed automatically, so the owner is
notified without any additional service. Workflow runs that crash before they can
comment are covered by GitHub's own workflow-failure notifications, which must be
enabled — this is the one part of FR-022 that depends on an account setting
rather than on code.

---

## D8. Offline capability

**Decision**: A hand-written service worker at `site/public/sw.js`, registered
from `main.ts` with a relative path. Runtime caching, no build-time manifest, no
dependency. Navigation requests are network-first with a cache fallback; hashed
assets are cache-first; anything fetched successfully is cached.

**Rationale**: Added after `/speckit-analyze` found that deferring offline
conflicted with constitution Principle IV, which the bootstrap clause does not
relax.

Network-first for the entry document is what satisfies FR-028: because
`index.html` is the only mutable object and is served `no-cache`, a visitor with
a network always gets the current version, and the cache is only consulted when
the network fails. Cache-first for hashed assets is safe precisely because their
names encode their content — a cached asset can never be a stale version of a
different file, which is the same property that makes publishing atomic (D2).

Registering with a relative path is what satisfies FR-029: the worker's scope
defaults to the directory it is served from, so it covers `/pr-42/` in a preview
and `/` in production without configuration.

**Why no build-time precache manifest**: precaching would require a Vite plugin
and a generated asset list. Runtime caching gives offline-after-first-visit with
about thirty lines and no dependency, which is what Principle II asks for. The
tradeoff is that a visitor who leaves before assets finish loading has an
incomplete cache — acceptable for a placeholder page, and worth revisiting when
there is a real application to cache.

**Alternatives considered**: Workbox (a dependency and a build step for
behaviour we can write directly); no service worker plus an amendment to
Principle IV (rejected by the owner — shipping in violation of a MUST in week
one sets the wrong precedent on a project about following the process).

---

## D9. How merge requirements are enforced: rulesets, not branch protection

**Decision**: Enforce FR-006 through FR-012 with a **repository ruleset**
(`POST /repos/{owner}/{repo}/rulesets`), not with classic branch protection
(`PUT /repos/{owner}/{repo}/branches/{branch}/protection`).

**Rationale**: Rulesets are GitHub's current mechanism and the one receiving new
capabilities; classic branch protection is the older path it supersedes. Beyond
being current, rulesets suit this project specifically:

- They target refs by pattern, so `~DEFAULT_BRANCH` stays correct if the default
  branch is ever renamed — classic protection is bound to a literal branch name.
- Their state is inspectable as a single JSON document listing every rule, which
  makes "what exactly is enforced?" answerable from one API call. Classic
  protection spreads the answer across nested optional objects, several of which
  are absent rather than false when unset.
- Multiple rulesets can coexist and layer, so adding a rule later does not mean
  rewriting the whole protection object and risking the silent loss of a setting
  that was omitted from the new payload.

That last point is a real hazard of the classic API: it is a full replacement,
so any field left out of a subsequent call is cleared.

**Applied in two stages**, because of a bootstrapping constraint:

1. **Now** — pull request required, linear history, no force pushes, no branch
   deletion. These can be enforced before any workflow exists.
2. **After the feature pull request merges** — the `required_status_checks` rule
   naming the `checks` and `deploy` contexts. Adding it earlier would demand
   checks that do not yet exist on any branch, leaving every open pull request
   permanently unmergeable with no way out but disabling the rule.

**Availability note**: both mechanisms require a public repository or a paid plan
for private repositories. The repository was made public on 2026-08-08 for this
reason; see the spec's Assumptions for what that changed.

---

## D10. The OIDC trust policy pins immutable repository IDs

**Decision**: The deploy roles' trust conditions list **both** subject formats as
exact strings:

```
repo:<owner>/<repo>:<event>
repo:<owner>@<ownerId>/<repo>@<repoId>:<event>
```

`SUCOPEKU_OWNER_ID` and `SUCOPEKU_REPO_ID` supply the numeric IDs at deploy time.

**Rationale**: This was found by running the pipeline, not by reasoning about it.
The first preview deploy failed with `Not authorized to perform
sts:AssumeRoleWithWebIdentity` while the trust policy, the identity provider, and
the audience all looked correct. Decoding the token GitHub actually issued showed
the subject was:

```
repo:MattCopenhaver@12800786/sucopeku@1326129239:pull_request
```

GitHub now embeds immutable numeric IDs in the subject claim, so that renaming an
account or repository cannot transfer trust to whoever subsequently claims the
released name. The plan had assumed the older name-only form documented in most
examples.

Both forms are listed because older repositories still emit the name-only
subject, and a trust policy that accepts only one is a policy that breaks on a
platform change in either direction.

**Why exact strings rather than a wildcard**: `repo:<owner>@*/<repo>@*:<event>`
would match regardless of the IDs and is tempting for its brevity. It also
reopens precisely the hole the immutable format exists to close — an attacker who
registered a released account name would match again. The wildcard trades away
the guarantee in exchange for not having to look up two numbers.

**Operational cost**: two more values are required at deploy time. They are
fetched once with:

```bash
gh api repos/<owner>/<repo> --jq '{repo_id: .id, owner_id: .owner.id}'
```

**Diagnostic worth keeping**: when role assumption fails and everything looks
correct, decode the token's claims rather than re-reading the policy. The
mismatch was invisible from the AWS side, because AWS reports only that the
condition did not match, never what the presented claim was.

---

## D11. Directory-style URLs redirect rather than rewrite

**Decision**: A CloudFront viewer-request function resolves directory-style
URLs. A URI ending in `/` is rewritten internally to its `index.html`. A URI
whose final segment has no file extension gets a **301 redirect** to the same
path with a trailing slash.

**Rationale**: CloudFront's `defaultRootObject` only resolves the distribution
root, so `/pr-42/` maps to the S3 key `pr-42/`, which does not exist. Previews
live at prefixes, so without this every preview returns 403 at the address a
person would actually type.

The redirect is the part that matters. Rewriting `/pr-42` internally serves the
correct document at the wrong address: the browser still believes it is at
`/pr-42`, whose directory is `/`, so every `./asset` reference resolves to the
distribution root and 404s, and the service worker registers at `/sw.js` with
the wrong scope. The page renders — unstyled and without offline support — which
is worse than an error, because it looks like it worked.

**Alternatives considered**: emitting absolute asset paths (would break
position-independence, D5, and with it the guarantee that previews and
production deploy an identical artifact); an S3 website endpoint, which resolves
index documents per prefix natively (HTTP only, so it forecloses service
workers entirely).

**Also removed here**: the distribution's 403/404 → `/index.html` error mapping.
On a distribution serving many prefixes it answered a missing preview with
production's entry document and masked genuine failures behind a 200.

---

## D12. Skipping code checks for specification-only changes

**Decision**: Workflow triggers stay unfiltered. Each workflow gains a `scope`
job that compares the pull request's base and head commits and decides whether
anything executable changed. The working jobs run conditionally on that answer,
and a small **gate job that always runs** is what branch protection requires.

```
scope ──► verify / preview   (conditional: only when code changed)
   └────► checks / deploy    (gate: always runs, reports the outcome)
```

**Rationale**: The obvious implementation — `paths-ignore` on the workflow
trigger — is a trap. A filtered-out workflow never starts, so a required status
check never reports, and GitHub waits for it indefinitely. A documentation-only
pull request becomes permanently unmergeable, and the only escape is deleting
the rule. FR-013 states the mergeability requirement explicitly for this reason.

Conditional jobs alone are not sufficient either: a job skipped by `if:` reports
a `skipped` conclusion, and whether a required check treats that as passing is
version- and configuration-dependent. The gate job removes the ambiguity by
always running and always reporting, so what branch protection observes is never
in doubt.

**What counts as executable**: anything not under `specs/`, not under
`.specify/`, and not a `.md` file. Workflow definitions therefore count as code —
a change to a workflow must be exercised by that workflow.

**Why compare commits rather than use a path-filter action**: `git diff` between
the pull request's base and head needs no third-party action and no dependency,
which suits a project whose constitution asks for the least machinery that
satisfies the requirement.

**Accepted cost**: a specification-only pull request still spends a few seconds
starting two jobs. The saving is the browser suite, the AWS deploy, and the
smoke test — minutes of runtime and a real deployment, avoided when nothing the
site serves has changed.

---

---

## D13. Scoping the budget with cost allocation tags

**Decision**: The CDK app applies `Project: sucopeku` to every resource it
creates, and the budget filters on `TagKeyValue: user:Project$sucopeku`. The
threshold is **$1/month**.

**Rationale**: FR-039 requires the threshold to watch this project rather than
the account. AWS Budgets can filter by cost allocation tag, which is the only
mechanism that tracks *these* resources rather than a category they happen to
fall into.

$1 is deliberately far below any plausible real cost. Storage and CloudFront
requests for a few hundred kilobytes of static assets should be fractions of a
cent, so the threshold is a tripwire rather than a budget — it fires when
something is wrong, not when the project gets busy.

**The manual step this creates**: user-defined tags must be *activated* as cost
allocation tags before any budget can filter on them:

```bash
aws ce update-cost-allocation-tags-status \
  --cost-allocation-tags-status TagKey=Project,Status=Active
```

Activation takes up to roughly 24 hours to take effect and is **not
retroactive** — spend recorded before activation carries no tag and will not
match the filter. Until it propagates, the filtered budget matches little or
nothing, which fails safe in the sense that it under-reports rather than
misfires, and unsafe in the sense that it is not yet protecting anything. This
joins GitHub's workflow-failure notification setting as a requirement no code can
satisfy.

**Alternatives considered**:

| Alternative | Rejected because |
|---|---|
| Filter by service (S3, CloudFront) | Needs no activation and works immediately, but captures every bucket and distribution in the account, not this project's. Equivalent only while the account hosts nothing else — an assumption that decays silently |
| Filter by linked account | Correct and total isolation, but requires a separate AWS account and Organizations |
| Filter by the IAM role that created the resource | Not possible. AWS attributes cost to resources, not to principals. This is why FR-040 is phrased about resources |
| `aws:cloudformation:stack-name`, an AWS-generated tag | Already applied without any CDK change, but still requires activation, and it spreads the project across four stack names instead of one value |

**What the tag does not cover**: costs that are not attributable to a taggable
resource — tax, support charges, and anything created outside this CDK app. Those
are exactly the costs FR-039 wants excluded, so the gap is the point.

---
