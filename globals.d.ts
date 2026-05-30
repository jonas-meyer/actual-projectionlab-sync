// Ambient types for window.projectionlabPluginAPI (page/MAIN world).
// Optional: it only exists once the user enables Plugins in ProjectionLab.
import type { PlExportData, PlProgress } from './lib/types';

declare global {
  interface Window {
    projectionlabPluginAPI?: {
      exportData(opts: { key: string }): Promise<PlExportData>;
      // Savings/investment/asset accounts take `balance`; debt accounts have no
      // `balance` and store the amount owed (positive) under `amount`.
      updateAccount(
        id: string,
        patch: { balance: number } | { amount: number },
        opts: { key: string },
      ): Promise<void>;
      restoreProgress(progress: PlProgress, opts: { key: string }): Promise<void>;
    };
  }
}
