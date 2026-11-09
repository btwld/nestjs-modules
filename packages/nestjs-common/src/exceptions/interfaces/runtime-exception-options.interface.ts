import { type HttpStatus } from '@nestjs/common';

export interface RuntimeExceptionOptions {
  httpStatus?: HttpStatus;
  message?: string;
  messageParams?: (string | number)[];
  safeMessage?: string;
  safeMessageParams?: (string | number)[];
  originalError?: unknown;
}
