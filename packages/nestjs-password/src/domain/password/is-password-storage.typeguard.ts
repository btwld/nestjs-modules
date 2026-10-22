import { type PlainLiteralObject } from '@nestjs/common';

import { type PasswordStorageInterface } from './interfaces/password-storage.interface.js';

export function isPasswordStorage(
  target: unknown,
): target is PasswordStorageInterface {
  return typeof (target as PlainLiteralObject)?.passwordHash === 'string';
}
