# Phase 1 Data Model: Delivery Pipeline

**Feature**: 001-delivery-pipeline
**Date**: 2026-08-07

This feature stores no application data — Principle IV forbids a backend and the
site is a placeholder. What follows models the entities the *pipeline* operates
on: deployments, their lifecycle, and the objects that make publishing atomic.

---

## Entity: Deployment

A complete, independently loadable copy of the site at a known address.

| Field | `preview` | `production` |
|---|---|---|
| Stack | Preview stack, shared by all pull requests | Its own stack |
| Bucket / distribution | Shared with other previews | Exclusive |
| `prefix` | `pr-<number>/` | `` (root) |
| `url` | `https://<preview-domain>/pr-<number>/` | `https://<production-domain>/` |
| Deploy role | Preview role, assumable from a pull request | Production role, assumable only from `main` |
| `pull_request` | Exactly one | None |
| Lifetime | Removed on merge or close | Never removed |

**Identity**: a deployment is identified by its stack plus its prefix. Preview
prefixes are derived from the pull request number rather than stored, so they are
stable across pushes and reproducible if a pull request is reopened (FR-003).

**Isolation, in two independent senses** — the distinction constitution 2.0.0
draws:

- *Between previews*: prefixes never overlap, so no preview can read or overwrite
  another's objects (FR-001, FR-016, SC-009). Infrastructure is shared; what a
  visitor sees is not.
- *Between previews and production*: no shared resources and no shared
  credentials. A preview deployment holds a role that cannot write to
  production's bucket, and cannot obtain one that can (FR-015).

### Lifecycle — preview

```text
pull request opened ─────► created  ──┐
                                      │ new commit pushed
                            updated ◄─┘
                               │
        pull request merged or closed
                               ▼
                            removed
```

- **created**: objects uploaded under `pr-<n>/`, URL commented on the pull request
- **updated**: same prefix, new content-hashed assets added, `index.html` replaced
- **removed**: every object under the prefix deleted (FR-016)
- **reopened**: returns to *created* — the prefix is derived, not stored, so it
  is reproducible

### Lifecycle — production

```text
merge to main ─────► published ──┐
                                 │ subsequent merge
                       published ◄┘
```

Never removed. A failed publish leaves the prior state serving (FR-022).

Production is deployed by the same ordered steps as a preview (FR-014); only the
target stack and the lifetime differ.

---

## Entity: Deployed Object

A single file within a deployment. Two kinds, distinguished by whether their name
encodes their content — this distinction is what makes publishing atomic.

| | Hashed asset | Entry document |
|---|---|---|
| Example key | `pr-42/assets/main-B3kf9x.js` | `pr-42/index.html` |
| Name contains content hash | Yes | No |
| Mutable | **Never** | Replaced on every deploy |
| Cache lifetime | 1 year, immutable | `no-cache` |
| Invalidated on deploy | No | Yes |
| Written | First | **Last** |

**The invariant**: because an asset's name encodes its content, two versions of
the same logical file never share a key. Both versions' assets coexist in the
bucket, so a visitor holding the previous `index.html` continues to resolve every
reference it makes. Only `index.html` is ever overwritten, and that write is a
single atomic object replacement. There is no interval during which a mix is
observable (FR-018, SC-010).

**Ordering is the whole mechanism.** If assets were written after the entry
document, a visitor could receive an `index.html` referencing files that do not
yet exist.

---

## Entity: Merge Requirement

A condition gating a pull request. Modelled here because the spec says the set is
expected to grow.

| Requirement | Source | Blocks merge |
|---|---|---|
| Branch current with `main` | Repository setting | Yes |
| Lint passes | `checks.yml` | Yes |
| Browser suite passes (local build) | `checks.yml` | Yes |
| Preview deployment succeeded | `deploy-preview.yml` | Yes |
| Preview smoke test passed | `deploy-preview.yml` | Yes |

Each reports pass or fail and names itself on failure (FR-009). Adding a
requirement is expected; removing one is a governance-level change.

---

## Entity: Failure Report

Every failure produces one, per FR-020 through FR-022.

| Field | Value |
|---|---|
| `origin` | Which workflow failed |
| `pull_request` | The pull request it concerns — including one already closed |
| `delivery` | A comment on that pull request |
| `notification` | GitHub subscription email to the owner, automatic |

**The gap this cannot close**: a workflow that dies before it can comment
produces no report. That case is covered by GitHub's own workflow-failure
notifications, which are an account setting rather than something this feature
builds. Recorded in `quickstart.md` as a manual verification step.

---

## Non-Entities

Stated so their absence is deliberate:

- **No user or session model.** No accounts, no authentication anywhere,
  including in front of previews.
- **No build artifact registry.** The bucket is the only record of what is
  deployed; the git SHA in the commit history is the only record of what produced
  it.
- **No environment configuration.** Preview and production deploy the identical
  artifact. Position-independence replaces per-environment configuration
  entirely (D5) — the deploy differs only in which bucket and prefix it targets,
  which is a workflow input, not a property of the build.
