import {
  CloudAssembly as CdkLibCloudAssembly,
  CloudArtifact as CdkLibCloudArtifact,
  NestedCloudAssemblyArtifact as CdkLibNestedCloudAssemblyArtifact,
} from "aws-cdk-lib/cx-api";
import {
  CloudAssembly as AwsCdkCloudAssembly,
  CloudAssemblyBuilder as AwsCdkCloudAssemblyBuilder
} from "@aws-cdk/cx-api";


export class CloudAssemblyConverter {
  private constructor() { }

  public static fromCdkLibCloudAssembly(cdkLibCloudAssembly: CdkLibCloudAssembly): AwsCdkCloudAssembly {
    const rootAwsCdkCloudAssemblyBuilder = new AwsCdkCloudAssemblyBuilder(cdkLibCloudAssembly.directory);
    cdkLibCloudAssembly.artifacts.forEach(artifact => {
      if (CdkLibNestedCloudAssemblyArtifact.isNestedCloudAssemblyArtifact(artifact)) {
        const cdkLibNestedAssembly = cdkLibCloudAssembly.getNestedAssembly(artifact.id);
        CloudAssemblyConverter.createAwsCdkNestedAssembliesRecursively(artifact, cdkLibNestedAssembly,
          rootAwsCdkCloudAssemblyBuilder);
      } else {
        rootAwsCdkCloudAssemblyBuilder.addArtifact(artifact.id, artifact.manifest);
      }
    });
    return rootAwsCdkCloudAssemblyBuilder.buildAssembly();
  }

  private static createAwsCdkNestedAssembliesRecursively(
    cdkLibCloudArtifact: CdkLibCloudArtifact,
    cdkLibNestedAssembly: CdkLibCloudAssembly,
    awsCdkParentBuilder: AwsCdkCloudAssemblyBuilder
  ): void {
    const nestedAwsCdkAssemblyBuilder = awsCdkParentBuilder.createNestedAssembly(cdkLibCloudArtifact.id,
      cdkLibCloudArtifact.manifest.displayName ?? cdkLibCloudArtifact.id);
    cdkLibNestedAssembly.artifacts.forEach(artifact => {
      if (CdkLibNestedCloudAssemblyArtifact.isNestedCloudAssemblyArtifact(artifact)) {
        const nestedCdkLibNestedAssembly = cdkLibNestedAssembly.getNestedAssembly(artifact.id);
        CloudAssemblyConverter.createAwsCdkNestedAssembliesRecursively(artifact, nestedCdkLibNestedAssembly,
          nestedAwsCdkAssemblyBuilder);
      } else {
        nestedAwsCdkAssemblyBuilder.addArtifact(artifact.id, artifact.manifest);
      }
    });
  }

  // FIXME: Incompatible @aws-cdk/cloud-assembly-schema

  // public static fromAwsCdkCloudAssembly(awsCdkCloudAssembly: AwsCdkCloudAssembly): CdkLibCloudAssembly {
  //   const rootCdkLibCloudAssemblyBuilder = new CdkLibCloudAssemblyBuilder();
  //   awsCdkCloudAssembly.artifacts.forEach(artifact => {
  //     if (AwsCdkNestedCloudAssemblyArtifact.isNestedCloudAssemblyArtifact(artifact)) {
  //       const cdkLibNestedAssembly = awsCdkCloudAssembly.getNestedAssembly(artifact.id);
  //       CloudAssemblyConverter.createCdkLibNestedAssembliesRecursively(artifact, cdkLibNestedAssembly,
  //         rootCdkLibCloudAssemblyBuilder);
  //     } else {
  //       rootCdkLibCloudAssemblyBuilder.addArtifact(artifact.id, artifact.manifest);
  //     }
  //   });
  //   return rootCdkLibCloudAssemblyBuilder.buildAssembly();
  // }

  // private static createCdkLibNestedAssembliesRecursively(
  //   awsCdkCloudArtifact: AwsCdkCloudArtifact,
  //   awsCdkNestedAssembly: AwsCdkCloudAssembly,
  //   cdkLibParentBuilder: CdkLibCloudAssemblyBuilder
  // ): void {
  //   const nestedCdkLibAssemblyBuilder = cdkLibParentBuilder.createNestedAssembly(awsCdkCloudArtifact.id,
  //     awsCdkCloudArtifact.manifest.displayName ?? awsCdkCloudArtifact.id);
  //   awsCdkNestedAssembly.artifacts.forEach(artifact => {
  //     if (AwsCdkNestedCloudAssemblyArtifact.isNestedCloudAssemblyArtifact(artifact)) {
  //       const nestedAwsCdkNestedAssembly = awsCdkNestedAssembly.getNestedAssembly(artifact.id);
  //       CloudAssemblyConverter.createCdkLibNestedAssembliesRecursively(artifact, nestedAwsCdkNestedAssembly,
  //         nestedCdkLibAssemblyBuilder);
  //     } else {
  //       nestedCdkLibAssemblyBuilder.addArtifact(artifact.id, artifact.manifest);
  //     }
  //   });
  // }
}
