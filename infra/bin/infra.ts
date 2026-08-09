#!/usr/bin/env node
import { App, Tags } from 'aws-cdk-lib';
import { BudgetStack } from '../lib/budget.js';
import { GithubOidcStack } from '../lib/github-oidc.js';
import { SiteStack } from '../lib/site-stack.js';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Deploying requires it — see specs/001-delivery-pipeline/quickstart.md.`,
    );
  }
  return value;
}

const app = new App();

// Every resource carries this, so the budget can watch this project rather than
// the whole account (FR-039, FR-040). Cost is attributable to resources, never
// to the credential that created them — which is why the tag goes here and not
// on the deploy roles. See research.md D13, including the manual activation the
// tag requires before any budget can filter on it.
export const PROJECT_TAG = { key: 'Project', value: 'sucopeku' };
Tags.of(app).add(PROJECT_TAG.key, PROJECT_TAG.value);

const repository = required('SUCOPEKU_REPOSITORY'); // e.g. "owner/repo"
const budgetEmail = required('SUCOPEKU_BUDGET_EMAIL');
// GitHub's OIDC subject claim carries immutable numeric IDs. Fetch with:
//   gh api repos/<owner>/<repo> --jq '{repo_id: .id, owner_id: .owner.id}'
// See research.md D10 for why the trust policy pins these rather than the names.
const ownerId = Number(required('SUCOPEKU_OWNER_ID'));
const repositoryId = Number(required('SUCOPEKU_REPO_ID'));
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
};

const oidc = new GithubOidcStack(app, 'SucopekuGithubOidc', { env });

// Production and previews are the same stack definition with different
// parameters. That is deliberate: it means the path a merge takes to production
// is the path every pull request has already exercised (FR-015).

new SiteStack(app, 'SucopekuProduction', {
  env,
  oidcProvider: oidc.provider,
  repository,
  ownerId,
  repositoryId,
  // Only workflows running from main. A pull request's token carries a
  // different subject and is refused (FR-016).
  trustedSubjects: ['ref:refs/heads/main'],
  // Production credentials cannot delete objects at all, which is how FR-019
  // stops being a promise and starts being a property.
  allowDelete: false,
});

new SiteStack(app, 'SucopekuPreviews', {
  env,
  oidcProvider: oidc.provider,
  repository,
  ownerId,
  repositoryId,
  trustedSubjects: ['pull_request'],
  // Teardown needs deletion (contract C4), scoped to this bucket alone.
  allowDelete: true,
});

new BudgetStack(app, 'SucopekuBudget', {
  env,
  notifyEmail: budgetEmail,
  // A tripwire, not a budget. Real cost for a few hundred kilobytes of static
  // assets is fractions of a cent, so $1 means something is wrong.
  monthlyLimitUsd: Number(process.env.SUCOPEKU_BUDGET_USD ?? 1),
  projectTag: PROJECT_TAG,
});
