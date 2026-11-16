import { HttpStatus } from '@nestjs/common';

import { FileUploadPolicyException } from '../file-upload-policy.exception.js';
import { FileException } from '../file.exception.js';

describe(FileUploadPolicyException.name, () => {
  const exception = new FileUploadPolicyException('extension');

  it('is a FileException with a bad request status', () => {
    expect(exception).toBeInstanceOf(FileException);
    expect(exception.httpStatus).toBe(HttpStatus.BAD_REQUEST);
    expect(exception.errorCode).toBe('FILE_UPLOAD_POLICY_ERROR');
  });

  it('names the rule, never the value', () => {
    expect(exception.message).toBe(
      'The file is refused by the upload policy: extension not allowed',
    );
    expect(exception.context).toEqual(
      expect.objectContaining({ rule: 'extension' }),
    );
  });
});
