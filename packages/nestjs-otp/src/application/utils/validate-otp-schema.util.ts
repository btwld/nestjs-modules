import { type StandardSchemaV1 } from '@standard-schema/spec';

import { OtpValidationException } from '../../domain/exceptions/otp-validation.exception.js';

export async function validateOtpSchema<Schema extends StandardSchemaV1>(
  schemaName: string,
  schema: Schema,
  data: unknown,
): Promise<StandardSchemaV1.InferOutput<Schema>> {
  const result = await schema['~standard'].validate(data);

  if (result.issues) {
    throw new OtpValidationException(schemaName, result.issues);
  }

  return result.value;
}
