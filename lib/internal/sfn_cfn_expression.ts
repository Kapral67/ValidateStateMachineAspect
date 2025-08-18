import { StateMachineType } from "@aws-sdk/client-sfn";

export interface SfnCfnExpression {
  definition: string;
  type: StateMachineType;
}
