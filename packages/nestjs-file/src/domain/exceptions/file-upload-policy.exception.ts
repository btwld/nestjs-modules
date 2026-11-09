import { HttpStatus } from '@nestjs/common';

import { type RuntimeException } from '@concepta/nestjs-core';

import { type FileUploadPolicyRule } from '../interfaces/file-upload-policy-rule.type.js';

import { FileException } from './file.exception.js';

/**
 * Thrown by create when the file breaks the module's upload policy. Names
 * the rule, never the caller's value.
 */
export class FileUploadPolicyException extends FileException {
  declare context: RuntimeException['context'] & {
    rule: FileUploadPolicyRule;
  };

  constructor(rule: FileUploadPolicyRule) {
    super({
      message: 'The file is refused by the upload policy: %s not allowed',
      messageParams: [rule],
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
    });

    this.errorCode = 'FILE_UPLOAD_POLICY_ERROR';

    this.context = {
      ...this.context,
      rule,
    };
  }
}
