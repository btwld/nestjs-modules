import { HttpStatus } from '@nestjs/common';

import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when `resolveCorrectionChain` finds more corrections than
 * its depth bound allows.
 *
 * Cycles are detected separately, so reaching the bound means a real chain
 * longer than expected. Returning the record reached so far would present a
 * superseded record as the one in effect.
 */
export class CorrectionChainDepthException extends RuntimeException {
  declare context: RuntimeException['context'] & {
    recordId: string;
    maxDepth: number;
  };

  constructor(
    recordId: string,
    maxDepth: number,
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message:
        'Record "%s" has more than %s corrections — raise maxDepth if the ' +
        'chain is genuinely this long',
      messageParams: [recordId, maxDepth],
      httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
      fault: 'internal',
      ...options,
    });

    this.context = { ...this.context, recordId, maxDepth };
    this.errorCode = 'CORRECTION_CHAIN_DEPTH';
  }
}
