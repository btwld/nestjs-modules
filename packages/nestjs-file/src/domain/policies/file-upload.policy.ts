import { FileUploadPolicyException } from '../exceptions/file-upload-policy.exception.js';
import { type FileInterface } from '../interfaces/file.interface.js';

/**
 * What a file may be. Each rule left out allows everything.
 */
export interface FileUploadPolicySettings {
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

  /**
   * Whether every upload must pass a malware scan before it is served. When
   * `true`, the module's options require a `scanner`. A registered scanner
   * scans every upload either way.
   */
  requireScan?: boolean;
}

/**
 * The rules a new file must meet, checked at create before anything is
 * written or an upload target issued.
 */
export class FileUploadPolicy {
  private readonly contentTypes?: Set<string>;
  private readonly extensions?: Set<string>;
  private readonly maxSize?: number;

  constructor(settings: FileUploadPolicySettings = {}) {
    this.contentTypes = lowerCaseSet(settings.contentTypes);
    this.extensions = lowerCaseSet(settings.extensions);
    this.maxSize = settings.maxSize;
  }

  /**
   * Throws `FileUploadPolicyException` naming the first rule the file
   * breaks: content type, then extension, then size. A size that isn't a
   * whole number of bytes from 0 up to `Number.MAX_SAFE_INTEGER` breaks the
   * size rule, with or without `maxSize`. Pass the file with its sanitized
   * name.
   */
  assertAllowed(
    file: Pick<FileInterface, 'fileName' | 'contentType' | 'size'>,
  ): void {
    if (
      this.contentTypes &&
      !this.contentTypes.has(file.contentType.toLowerCase())
    ) {
      throw new FileUploadPolicyException('contentType');
    }

    if (this.extensions && !this.extensions.has(extensionOf(file.fileName))) {
      throw new FileUploadPolicyException('extension');
    }

    if (
      !Number.isSafeInteger(file.size) ||
      file.size < 0 ||
      (this.maxSize !== undefined && file.size > this.maxSize)
    ) {
      throw new FileUploadPolicyException('size');
    }
  }
}

function lowerCaseSet(values?: string[]): Set<string> | undefined {
  return values && new Set(values.map((value) => value.toLowerCase()));
}

/**
 * The lower-cased text after the last dot, or `''` for a name without one.
 * A leading dot, as in `.env`, starts the name rather than an extension.
 */
function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');

  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : '';
}
