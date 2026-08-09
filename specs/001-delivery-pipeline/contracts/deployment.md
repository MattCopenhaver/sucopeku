# Contract: Deployment Surface

**Feature**: 001-delivery-pipeline
**Date**: 2026-08-07

The interfaces this feature exposes. Each is something another party — a visitor,
a contributor, or a later feature — depends on, so changing one is a breaking
change rather than a refactor.

---

## C1. URL layout

```text
https://<production-domain>/                → production   (its own distribution)
https://<preview-domain>/pr-<number>/       → preview for pull request <number>
```

**Guarantees**:

- A preview address is derived from the pull request number alone, so it is
  stable for that pull request's entire life and reproducible if it is reopened.
- Every address serves a complete copy of the site. Nothing is shared between
  prefixes at request time.
- Both are public. No credentials, headers, or allowlisting are required (FR-005).
- Production and previews are served by **different distributions backed by
  different buckets**. No preview path can collide with a production path, and no
  preview deployment holds credentials that reach production (FR-015).

**Constraint on the site**: all asset references MUST be relative. An absolute
reference to `/assets/...` resolves to the production asset when loaded from a
preview, silently serving the wrong build. This is the single most likely way to
break the contract, and it is invisible until it happens.

---

## C2. Cache and immutability

| Path pattern | `Cache-Control` | Mutability |
|---|---|---|
| `**/index.html` | `no-cache` | Replaced every deploy |
| `**/assets/**` | `public, max-age=31536000, immutable` | Never modified or deleted |

**Guarantee to visitors**: any asset URL that has ever been served continues to
resolve for the lifetime of the deployment. This is what allows a page loaded
before a publish to keep working through it (FR-019).

**Guarantee to the pipeline**: only `index.html` requires invalidation, so a
deploy issues exactly one invalidation path and stays inside CloudFront's free
allowance.

---

## C3. Deploy operation

**Input**: a built artifact directory, a target bucket, a target prefix.

The steps below are identical for previews and production. Only the bucket,
prefix, and assumed role differ — which is what FR-014 requires and what makes
every merge to `main` follow a path already exercised by every pull request.

**Ordered steps** — the order is the contract, not an implementation detail:

1. Upload every hashed asset. Idempotent: an object with the same key already has
   identical content.
2. Verify all uploads succeeded. **If any failed, stop here.** `index.html` is
   untouched and the previous version is still serving correctly (FR-020).
3. Upload `index.html`.
4. Invalidate `/index.html` for that prefix.

**Postcondition on success**: the prefix serves the new version, and every
previously served asset URL still resolves.

**Postcondition on failure**: the prefix serves exactly the version it served
before. No mixed state is reachable, because the only mutable object is written
after everything it references.

**Safely interruptible.** The same ordering makes cancellation harmless at any
point: stopping during asset upload leaves orphaned immutable objects and an
untouched entry document; stopping during the entry-document write yields either
the old object or the new one, since `PutObject` is atomic. This holds only
because the operation performs no stateful AWS work beyond object writes — see
the standing constraint in `research.md` D3.

---

## C4. Teardown operation

**Input**: a pull request number.

**Steps**: delete every object under `pr-<number>/` in the preview bucket.

**Guarantees**: touches no other prefix. It cannot affect production at all — the
role it runs under has no access to production's bucket, so this is enforced by
AWS rather than by the correctness of the prefix it was handed (FR-015, FR-018).
Idempotent: deleting an already-deleted prefix succeeds.

---

## C5. Pull request comment

The pipeline's interface to the contributor.

**On preview deploy success** — one comment, updated in place on subsequent
pushes rather than appended, so a long pull request does not accumulate noise:

```markdown
**Preview deployed** → https://<preview-domain>/pr-<number>/
Commit: <short-sha>
```

**On any failure** — including teardown failures posted to an already-closed
pull request (FR-020, FR-021):

```markdown
**<workflow> failed** — <one-line reason>
Run: <link to the workflow run>
```

**Guarantee**: every failure the pipeline can detect reaches the pull request,
and therefore reaches the owner by GitHub's subscription notifications. The
uncovered case — a workflow dying before it can comment — is handled outside this
contract by GitHub's workflow-failure notification setting.

---

## C6. Pull request template

`.github/pull_request_template.md` MUST contain the heading `## SDD Notes`
verbatim, and MUST leave the section empty (FR-034).

The questions the constitution's definition of done requires are deliberately
**not** reproduced in the template. Pre-printed prompts anchor the answer before
the author has thought about it, and the notes are this project's only evidence
about whether specs-plus-AI removes the need for unit tests — evidence shaped by
the phrasing of a prompt is worth less than evidence that isn't. The constitution
still governs what the notes must cover; the template simply declines to write
the beginning of the answer.

**Guarantee to a future feature**: because pull requests are squash-merged, this
section lands in the commit message on `main` and is recoverable with
`git log`. The deferred "lessons learned" publication feature depends on this
heading being exact and stable — treat it as a data format, not as prose.
