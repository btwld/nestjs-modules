/**
 * What a file may be, checked at create before anything is written or an
 * upload target issued. Each rule left out allows everything.
 */
export interface FileUploadPolicyInterface {
  /**
   * MIME types allowed, such as `application/pdf`. Compared without regard
   * to case.
   */
  contentTypes?: string[];

  /**
   * Extensions allowed, without the dot, such as `pdf`. Matched against the
   * sanitized name's last extension, without regard to case; a name without
   * one is refused.
   */
  extensions?: string[];

  /**
   * Largest size allowed, in bytes.
   */
  maxSize?: number;
}
