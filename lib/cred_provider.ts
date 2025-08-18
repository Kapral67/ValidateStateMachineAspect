export interface CredentialProviderProps {
  readonly account: string;
  readonly region: string;
}

// SDKV3CompatibleCredentials @aws-cdk/cli-plugin-contract
export interface Credentials {
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly sessionToken?: string;
  readonly expiration?: Date;
}

export interface ICredentialProvider {
  defaultEnvironment: CredentialProviderProps;
  getCredentials(props?: CredentialProviderProps): Promise<Credentials>;
}
