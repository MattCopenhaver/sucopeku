import { Stack, type StackProps } from 'aws-cdk-lib';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import type { Construct } from 'constructs';

export interface BudgetStackProps extends StackProps {
  /** Where the threshold notification is sent. */
  readonly notifyEmail: string;
  /** Monthly ceiling in USD. */
  readonly monthlyLimitUsd: number;
}

/**
 * The account spending threshold required by FR-036.
 *
 * This is the backstop for the one failure mode nothing else here can catch:
 * cost that accrues without any job failing, so no workflow reports anything.
 * FR-035 keeps that number tiny by construction — every component is billed by
 * usage — but "should be pennies" is a belief until something measures it.
 *
 * AWS Budgets is free for the first two budgets, so this costs nothing.
 */
export class BudgetStack extends Stack {
  constructor(scope: Construct, id: string, props: BudgetStackProps) {
    super(scope, id, props);

    new budgets.CfnBudget(this, 'MonthlyCost', {
      budget: {
        budgetName: 'sucopeku-monthly',
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: { amount: props.monthlyLimitUsd, unit: 'USD' },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 50,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [{ subscriptionType: 'EMAIL', address: props.notifyEmail }],
        },
        {
          notification: {
            notificationType: 'FORECASTED',
            comparisonOperator: 'GREATER_THAN',
            threshold: 100,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [{ subscriptionType: 'EMAIL', address: props.notifyEmail }],
        },
      ],
    });
  }
}
