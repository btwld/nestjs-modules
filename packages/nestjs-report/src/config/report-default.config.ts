import { registerAs } from '@nestjs/config';
import { REPORT_MODULE_DEFAULT_SETTINGS_TOKEN } from '../report.constants';
import { ReportSettingsInterface } from '../interfaces/report-settings.interface';

/**
 * Default configuration for report module.
 */
export const reportDefaultConfig = registerAs(
  REPORT_MODULE_DEFAULT_SETTINGS_TOKEN,
  (): ReportSettingsInterface => ({
    generateTimeout: process.env?.REPORT_MODULE_TIMEOUT_IN_SECONDS
      ? Number(process.env.REPORT_MODULE_TIMEOUT_IN_SECONDS)
      : 60000,
  }),
);
