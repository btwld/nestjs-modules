import { type ExceptionContext } from '../../core.types';

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
