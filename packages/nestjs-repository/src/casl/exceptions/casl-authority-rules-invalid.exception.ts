import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Thrown when the rules `CaslAuthority` is given for an actor cannot be
 * used, listing every problem found. Refuses the call, and every other call
 * on the same ctx.
 */
export class CaslAuthorityRulesInvalidException extends RuntimeException {
  declare context: RuntimeException['context'] & { problems: string[] };

  constructor(problems: string[], options?: RuntimeExceptionOptions) {
    super({
      message: 'Authority rules are invalid: %s',
      messageParams: [problems.join('; ')],
      fault: 'usage',
      ...options,
    });

    this.errorCode = 'CASL_AUTHORITY_RULES_INVALID_ERROR';
    this.context = { ...this.context, problems };
  }
}
