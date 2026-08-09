import { Stack, type StackProps } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';

/**
 * The GitHub OIDC identity provider.
 *
 * This is the one thing production and previews unavoidably share: AWS permits a
 * single identity provider per issuer URL per account. It is not a weakening of
 * the isolation FR-016 requires — a provider grants nothing on its own. What
 * separates production from previews is the *trust condition* on each role,
 * which names which git ref may assume it. Sharing the provider is like sharing
 * a front door; the locks are on the individual rooms.
 */
export class GithubOidcStack extends Stack {
  readonly provider: iam.IOpenIdConnectProvider;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.provider = new iam.OpenIdConnectProvider(this, 'GithubProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });
  }
}
