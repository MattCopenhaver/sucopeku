/**
 * Prints each stack's outputs, including its distribution domain.
 *
 * The domains are deliberately not written down anywhere in this repository:
 * they are properties of a deployment, not of the project, so the deployment is
 * their only source of truth and nothing can go stale.
 */
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';

const STACKS = ['SucopekuProduction', 'SucopekuPreviews'];

async function main(): Promise<void> {
  const cfn = new CloudFormationClient({});

  for (const stackName of STACKS) {
    try {
      const { Stacks } = await cfn.send(new DescribeStacksCommand({ StackName: stackName }));
      const outputs = Stacks?.[0]?.Outputs ?? [];
      console.log(`\n${stackName}`);
      if (outputs.length === 0) {
        console.log('  (no outputs)');
        continue;
      }
      for (const { OutputKey, OutputValue } of outputs) {
        console.log(`  ${OutputKey}: ${OutputValue}`);
      }
    } catch {
      console.log(`\n${stackName}\n  not deployed`);
    }
  }
  console.log('');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
