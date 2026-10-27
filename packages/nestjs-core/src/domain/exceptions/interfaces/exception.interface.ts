import { type ExceptionContext } from '../../types/operation.types.js';

export interface ExceptionInterface extends Error {
  /**
   * The error code.
   */
  errorCode: string;

  /**
   * Additional context
   */
  context?: ExceptionContext;
}
