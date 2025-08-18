import toolkit_lib_internal = require("../node_modules/@aws-cdk/toolkit-lib/lib/api/index.js");
import { CloudAssembly as CdkLibCloudAssembly } from "aws-cdk-lib/cx-api";
import { CloudAssemblyConverter } from "./internal/cloud_assembly_converter";
import { CloudAssembly as AwsCdkCloudAssembly } from "@aws-cdk/cx-api";
import { ValidateStateMachineSDK } from "./internal/sdk";
import { ICredentialProvider } from "./cred_provider";
import { SfnCfnExpression } from "./internal/sfn_cfn_expression";
import { ValidateStateMachineDefinitionSeverity } from "@aws-sdk/client-sfn";
import { ISfnValidationConfig } from "./validation_config";
import { NonInteractiveIoHost } from "@aws-cdk/toolkit-lib";
import { NotificationHelper } from "./internal/notification_helper.js";
import { region_info } from "aws-cdk-lib";

export class CfnStateMachineValidator {

  private constructor() { }

  public static validate(
    cdkCloudAssembly: CdkLibCloudAssembly,
    credProvider: ICredentialProvider,
    sfnValidationConfig: ISfnValidationConfig,
  ) {
    const cloudAssembly: AwsCdkCloudAssembly = CloudAssemblyConverter.fromCdkLibCloudAssembly(cdkCloudAssembly);

    for (const stackArtifact of cloudAssembly.stacksRecursively) {
      const sfnDefinitionCfnExpressions: SfnCfnExpression[] = [];

      Object.keys(stackArtifact.template.Resources).forEach(resourceId => {
        const resource = stackArtifact.template.Resources[resourceId];
        if (resource.Type === "AWS::StepFunctions::StateMachine") {
          const sfnCfnExpressionDefinition = resource.Properties.DefinitionString;
          if (sfnCfnExpressionDefinition) {
            sfnDefinitionCfnExpressions.push({
              definition: sfnCfnExpressionDefinition,
              type: resource.Properties.StateMachineType || "STANDARD",
            });
          }
        }
      });

      if (sfnDefinitionCfnExpressions.filter(Boolean).length < 1) {
        continue;
      }

      const credentialProviderProps = {
        account: stackArtifact.environment.account,
        region: stackArtifact.environment.region,
      };
      if (credentialProviderProps.account.includes("unknown")) {
        credentialProviderProps.account = credProvider.defaultEnvironment.account;
      }
      if (credentialProviderProps.region.includes("unknown")) {
        credentialProviderProps.region = credProvider.defaultEnvironment.region;
      }

      const ioHelper = NotificationHelper.getIoHelper(new NonInteractiveIoHost());
      const sdkLogger = NotificationHelper.getSdkLogger(ioHelper);

      const sdk = new ValidateStateMachineSDK(() => credProvider.getCredentials(credentialProviderProps),
        credentialProviderProps.region, {}, ioHelper, sdkLogger);

      const evaluatedTemplate = new toolkit_lib_internal.EvaluateCloudFormationTemplate({
        stackArtifact,
        parameters: {},
        account: credentialProviderProps.account,
        region: credentialProviderProps.region,
        partition: region_info.RegionInfo.get(credentialProviderProps.region).partition ?? "aws",
        sdk,
      });

      sfnDefinitionCfnExpressions.forEach(async (sfnDefinitionCfnExpression) => {

        let evaluatedSfnDefinition = await evaluatedTemplate.evaluateCfnExpression(
          sfnDefinitionCfnExpression.definition);
        if (typeof evaluatedSfnDefinition !== 'string') {
          evaluatedSfnDefinition = JSON.stringify(evaluatedSfnDefinition);
        }

        sfnValidationConfig.onEvaluation?.(evaluatedSfnDefinition);

        const validateStateMachineResponse = await sdk.stepFunctions().validateStateMachine({
          definition: evaluatedSfnDefinition,
          type: sfnDefinitionCfnExpression.type,
          severity: ValidateStateMachineDefinitionSeverity.WARNING,
        });

        const failures = validateStateMachineResponse.diagnostics?.filter(diagnostic =>
          diagnostic.severity === ValidateStateMachineDefinitionSeverity.ERROR) || [];
        if (failures.length > 0) {
          sfnValidationConfig.onFailure(failures);
        }

        const warnings = validateStateMachineResponse.diagnostics?.filter(diagnostic =>
          diagnostic.severity === ValidateStateMachineDefinitionSeverity.WARNING) || [];
        if (warnings.length > 0) {
          sfnValidationConfig.onWarning?.(warnings);
        }

      });
    }
  }
}
