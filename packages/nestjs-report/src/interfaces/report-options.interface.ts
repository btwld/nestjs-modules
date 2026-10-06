import { type ReportGeneratorServiceInterface } from './report-generator-service.interface';
import { type ReportSettingsInterface } from './report-settings.interface';

export interface ReportOptionsInterface {
  reportGeneratorServices?: ReportGeneratorServiceInterface[];
  settings?: ReportSettingsInterface;
}
