import toolkit_lib_internal = require("../../node_modules/@aws-cdk/toolkit-lib/lib/api/aws-auth/sdk.js");
import {
  SFNClient,
  UpdateStateMachineCommand,
  UpdateStateMachineCommandInput,
  ValidateStateMachineDefinitionCommand,
  ValidateStateMachineDefinitionCommandInput,
  ValidateStateMachineDefinitionCommandOutput
} from "@aws-sdk/client-sfn";

export interface IValidateStateMachineSfnClient extends toolkit_lib_internal.IStepFunctionsClient {
  validateStateMachine(input: ValidateStateMachineDefinitionCommandInput):
    Promise<ValidateStateMachineDefinitionCommandOutput>;
}

export class ValidateStateMachineSDK extends toolkit_lib_internal.SDK {
  public override stepFunctions(): IValidateStateMachineSfnClient {
    const client = new SFNClient(this.config);
    return {
      updateStateMachine: (input: UpdateStateMachineCommandInput) =>
        client.send(new UpdateStateMachineCommand(input)),
      validateStateMachine: (input: ValidateStateMachineDefinitionCommandInput) =>
        client.send(new ValidateStateMachineDefinitionCommand(input)),
    };
  }
}
