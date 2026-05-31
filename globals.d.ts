import type { PlExportData, PlProgress } from './lib/types';

declare global {
  interface Window {
    // Only present once the user enables Plugins in ProjectionLab.
    projectionlabPluginAPI?: {
      exportData(opts: { key: string }): Promise<PlExportData>;
      updateAccount(
        id: string,
        patch: { balance: number } | { amount: number },
        opts: { key: string },
      ): Promise<void>;
      restoreProgress(progress: PlProgress, opts: { key: string }): Promise<void>;
    };
  }
}
