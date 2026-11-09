import { NotAnErrorException } from '../../domain/exceptions/not-an-error.exception.js';

export function mapNonErrorToException(error: unknown): Error {
  return error instanceof Error ? error : new NotAnErrorException(error);
}
