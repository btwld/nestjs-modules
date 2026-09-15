import { type AuditInterface } from '../../../audit/interfaces/audit.interface';
import { type ReferenceIdInterface } from '../../../reference/interfaces/reference-id.interface';
import { type FileOwnableInterface } from '../../file/interfaces/file-ownable.interface';
import { type ReportStatusEnum } from '../enum/report-status.enum';

/**
 * Interface representing a report entity
 */
export interface ReportInterface
  extends ReferenceIdInterface, FileOwnableInterface, AuditInterface {
  /**
   * Service key associated with the report
   */
  serviceKey: string;

  /**
   * Report name of the report
   */
  name: string;

  /**
   * Status of the report
   */
  status: ReportStatusEnum;

  /**
   * Error message (null if no error)
   */
  errorMessage: string | null;

  /**
   * Dynamic download URI for the report
   */
  downloadUrl?: string;
}
