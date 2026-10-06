import { mock } from 'vitest-mock-extended';

import { type PasswordCreationService } from '../../../../domain/services/password-creation.service.js';
import { type PasswordValidationService } from '../../../../domain/services/password-validation.service.js';

export function createMockCreationService() {
  return mock<PasswordCreationService>();
}

export function createMockValidationService() {
  return mock<PasswordValidationService>();
}
