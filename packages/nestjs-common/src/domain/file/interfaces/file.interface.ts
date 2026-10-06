import { type AuditInterface } from '../../../audit/interfaces/audit.interface';
import { type ReferenceIdInterface } from '../../../reference/interfaces/reference-id.interface';

/**
 * Interface representing a file entity
 */
export interface FileInterface extends ReferenceIdInterface, AuditInterface {
  /**
   * Service key associated with the file
   */
  serviceKey: string;

  /**
   * Name of the file
   */
  fileName: string;

  /**
   * contentType of the file
   */
  contentType: string;

  /**
   * Dynamic upload URI for the file
   */
  uploadUri?: string;

  /**
   * Dynamic download URL for the file
   */
  downloadUrl?: string;
}
