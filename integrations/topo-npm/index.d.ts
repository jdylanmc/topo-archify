export interface RuntimeIntegrity {
  readonly repo: string;
  readonly revision: string;
  readonly version: string;
  readonly archiveSha256: string;
  readonly files: number;
}
export const runtimeDirectory: string;
export const cliPath: string;
export const architectureRendererPath: string;
export const outputCheckerPath: string;
export function verifyRuntime(root?: string): RuntimeIntegrity;
