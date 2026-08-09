import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';

export interface SiteStackProps extends StackProps {
  /** The GitHub OIDC provider. Shared; see github-oidc.ts for why that is safe. */
  readonly oidcProvider: iam.IOpenIdConnectProvider;
  /** `owner/repo`, used to build the OIDC trust condition. */
  readonly repository: string;
  /**
   * Which OIDC subjects may assume this stack's deploy role.
   *
   * This is where FR-016 is actually enforced. Production names only
   * `ref:refs/heads/main`, so a workflow triggered by a pull request receives a
   * token AWS refuses — regardless of what that pull request writes in its own
   * workflow file. A guarantee that rests on workflow discipline is not a
   * guarantee, because a pull request can edit the workflow.
   */
  readonly trustedSubjects: string[];
  /**
   * Whether the deploy role may delete objects.
   *
   * Production is denied deletion outright. FR-019 says a publish must never
   * remove a previous version's files, and the cheapest way to guarantee that is
   * credentials that cannot do it. Previews need deletion for teardown (C4).
   */
  readonly allowDelete: boolean;
}

/**
 * One deployment environment: a private bucket, a CloudFront distribution that
 * serves it anonymously, and a role CI can assume to publish into it.
 *
 * Instantiated twice — production and previews — so that production is not a
 * bespoke path that can drift from the one every pull request exercises (FR-015).
 */
export class SiteStack extends Stack {
  readonly bucket: s3.Bucket;
  readonly distribution: cloudfront.Distribution;
  readonly deployRole: iam.Role;

  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props);

    // Private bucket. Nothing reads it directly; CloudFront is granted access
    // via Origin Access Control below.
    this.bucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // The distribution is what the public reaches, and it requires no
    // credentials (FR-005). On AWS the default is the opposite — buckets are
    // private and stay private — so anonymous read is configured here
    // deliberately rather than inherited.
    this.distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        // Service workers require HTTPS, so the redirect above is a
        // prerequisite for offline support (FR-028), not just good practice.
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      // A preview lives under `pr-<n>/`, where a bare directory request must
      // resolve to that prefix's own index.html rather than production's.
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    this.deployRole = new iam.Role(this, 'DeployRole', {
      assumedBy: new iam.WebIdentityPrincipal(props.oidcProvider.openIdConnectProviderArn, {
        StringEquals: { 'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com' },
        StringLike: {
          'token.actions.githubusercontent.com:sub': props.trustedSubjects.map(
            (subject) => `repo:${props.repository}:${subject}`,
          ),
        },
      }),
      maxSessionDuration: Duration.hours(1),
      description: `Publishes the site into ${id}. Assumable only by: ${props.trustedSubjects.join(', ')}`,
    });

    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:PutObject', 's3:GetObject'],
        resources: [this.bucket.arnForObjects('*')],
      }),
    );
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:ListBucket'],
        resources: [this.bucket.bucketArn],
      }),
    );
    if (props.allowDelete) {
      this.deployRole.addToPolicy(
        new iam.PolicyStatement({
          actions: ['s3:DeleteObject'],
          resources: [this.bucket.arnForObjects('*')],
        }),
      );
    }
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['cloudfront:CreateInvalidation'],
        resources: [
          Stack.of(this).formatArn({
            service: 'cloudfront',
            region: '',
            resource: 'distribution',
            resourceName: this.distribution.distributionId,
          }),
        ],
      }),
    );

    // Outputs rather than a value written down anywhere: the deployment is the
    // only source of truth for its own address, so nothing can go stale.
    new CfnOutput(this, 'DistributionDomain', {
      value: this.distribution.distributionDomainName,
      description: 'Public host serving this environment',
    });
    new CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'Bucket the deploy script writes into',
    });
    new CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'Distribution the deploy script invalidates',
    });
    new CfnOutput(this, 'DeployRoleArn', {
      value: this.deployRole.roleArn,
      description: 'Role CI assumes to publish into this environment',
    });
  }
}
