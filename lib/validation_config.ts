export interface SfnValidationDiagnostic {
  readonly code?: string;
  readonly message?: string;
  readonly location?: string;
}

export interface ISfnValidationConfig {
  onFailure(failures: SfnValidationDiagnostic[]): void;
  onEvaluation?(evaluatedSfnDefinition: string): void;
  onWarning?(warnings: SfnValidationDiagnostic[]): void;
}
