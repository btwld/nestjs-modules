import { Injectable } from '@nestjs/common';

import { FileUploadPolicyException } from '../exceptions/file-upload-policy.exception.js';
import { type FileUploadPolicyInterface } from '../interfaces/file-upload-policy.interface.js';
import { type FileInterface } from '../interfaces/file.interface.js';

/**
 * Checks a new file against the module's `uploadPolicy`. Without a policy,
 * every file is allowed.
 */
@Injectable()
export class FileUploadPolicyService {
  private readonly contentTypes?: Set<string>;
  private readonly extensions?: Set<string>;
  private readonly maxSize?: number;

  constructor(policy: FileUploadPolicyInterface = {}) {
    this.contentTypes = lowerCaseSet(policy.contentTypes);
    this.extensions = lowerCaseSet(policy.extensions);
    this.maxSize = policy.maxSize;
  }

  /**
   * Throws `FileUploadPolicyException` naming the first rule the file
   * breaks: content type, then extension, then size. Pass the file with its
   * sanitized name.
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

    if (this.maxSize !== undefined && file.size > this.maxSize) {
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
