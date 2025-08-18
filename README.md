# Validate CDK State Machines

- Validate CDK defined State Machines during `synth` before deployment

### Limitations

- State Machines should be defined in separate stack(s) that are dependent on the stacks creating resources they use
- The resource stacks should be deployed before the validations will work because otherwise sdk calls made to cfn for lookups will fail

### Crude Example

```ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';

class JobPollerLambdaStack extends cdk.Stack {
  public readonly getStatusLambda: lambda.IFunction;
  public readonly submitLambda: lambda.IFunction;

  constructor(app: cdk.App, id: string) {
    super(app, id);

    this.getStatusLambda = new lambda.Function(this, 'CheckLambda', {
      code: lambda.Code.fromInline(
        'exports.handler=function(event){if(event.status==="SUCCEEDED"){return{status:"SUCCEEDED",id:event.id}}else{return{status:"FAILED",id:event.id}}};'
      ),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_LATEST,
      timeout: cdk.Duration.seconds(30),
    });

    this.submitLambda = new lambda.Function(this, 'SubmitLambda', {
      code: new lambda.InlineCode('exports.handler=function(event){return{id:event.id,status:"SUCCEEDED"}};'),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_LATEST,
      timeout: cdk.Duration.seconds(30),
    });
  }
}

class JobPollerStepFunctionStack extends cdk.Stack {
  constructor(app: cdk.App, id: string, submitLambda: lambda.IFunction, getStatusLambda: lambda.IFunction) {
    super(app, id);

    const submitJob = new tasks.LambdaInvoke(this, 'Submit Job', {
      lambdaFunction: submitLambda,
      outputPath: '$.Payload',
    });
    const waitX = new sfn.Wait(this, 'Wait X Seconds', {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(30)),
    });
    const getStatus = new tasks.LambdaInvoke(this, 'Get Job Status', {
      lambdaFunction: getStatusLambda,
      outputPath: '$.Payload',
    });

    const jobFailed = new sfn.Fail(this, 'Job Failed', {
      cause: 'AWS Batch Job Failed',
      error: 'DescribeJob returned FAILED',
    });

    const finalStatus = new tasks.LambdaInvoke(this, 'Get Final Job Status', {
      lambdaFunction: getStatusLambda,
      outputPath: '$.Payload',
    });

    const choice = new sfn.Choice(this, 'Job Complete?');

    const definition = submitJob
      .next(waitX)
      .next(getStatus)
      .next(choice);

    choice
      .when(sfn.Condition.stringEquals('$.status[', 'FAILED'), jobFailed)
      .when(sfn.Condition.stringEquals('$.status', 'SUCCEEDED'), finalStatus)
      .otherwise(waitX);

    // To generate some errors for validating
    new sfn.Pass(this, 'Pass').next(waitX);

    const stateMachine = new sfn.StateMachine(this, 'CronStateMachine', {
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      timeout: cdk.Duration.minutes(5),
    });

    submitLambda.grantInvoke(stateMachine.role);
    getStatusLambda.grantInvoke(stateMachine.role);
  }

}

const app = new cdk.App();
const lambdaStack = new JobPollerLambdaStack(app, 'aws-stepfunctions-integ'); // must be deployed
new JobPollerStepFunctionStack(app, 'aws-stepfunctions-integ-sfn', lambdaStack.submitLambda, lambdaStack.getStatusLambda);

/** ------------------ TEST ------------------ */

const cloudAssembly = app.synth();

import {
  CfnStateMachineValidator,
  Credentials,
  CredentialProviderProps,
  ICredentialProvider,
  ISfnValidationConfig,
  SfnValidationDiagnostic
} from '@maxkapral/validate-cdk-state-machines';

const credentials: Credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  sessionToken: process.env.AWS_SESSION_TOKEN ?? "",
};

CfnStateMachineValidator.validate(
  cloudAssembly,
  {
    defaultEnvironment: {
      account: "012345678901",
      region: "us-east-1",
    } as CredentialProviderProps,
    getCredentials: async () => credentials,
  } as ICredentialProvider,
  {
    onFailure(failures: SfnValidationDiagnostic[]): void {
      console.error(JSON.stringify(failures, null, 2));
    },
    onWarning(warnings: SfnValidationDiagnostic[]): void {
      console.error(JSON.stringify(warnings, null, 2));
    },
    onEvaluation(evaluatedSfnDefinition: string): void {
      console.log(JSON.stringify(JSON.parse(evaluatedSfnDefinition), null, 2));
    },
  } as ISfnValidationConfig
);
```
