import { HttpStatus } from '@nestjs/common';

import { OtpValidationException } from '../../../domain/exceptions/otp-validation.exception.js';
import { otpCreateSchema } from '../../../infrastructure/schemas/otp-create.schema.js';
import { validateOtpSchema } from '../validate-otp-schema.util.js';

describe('validateOtpSchema', () => {
  const validData = {
    category: 'test-category',
    type: 'uuid',
    expiresIn: '1h',
    assigneeId: 'test-assignee',
  };

  it('returns the parsed value for valid data', async () => {
    const result = await validateOtpSchema(
      'OtpCreate',
      otpCreateSchema,
      validData,
    );

    expect(result).toEqual(validData);
  });

  it('throws OtpValidationException for invalid data', async () => {
    const { assigneeId: _assigneeId, ...invalidData } = validData;

    await expect(
      validateOtpSchema('OtpCreate', otpCreateSchema, invalidData),
    ).rejects.toThrow(OtpValidationException);
  });

  it('includes the schemaName and validation issues in the exception context', async () => {
    const { assigneeId: _assigneeId, ...invalidData } = validData;

    try {
      await validateOtpSchema('OtpCreate', otpCreateSchema, invalidData);
      throw new Error('Expected OtpValidationException');
    } catch (error) {
      if (!(error instanceof OtpValidationException)) {
        throw error;
      }

      expect(error.context.schemaName).toBe('OtpCreate');
      expect(error.context.validationErrors.length).toBeGreaterThan(0);
      expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    }
  });
});
