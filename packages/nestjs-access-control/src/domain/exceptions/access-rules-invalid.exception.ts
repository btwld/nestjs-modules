import { type RuntimeException } from '@concepta/nestjs-core';

import { AccessControlException } from './access-control.exception.js';

/**
 * Thrown when a rule set cannot be used, listing every problem found. At
 * startup it fails boot; from a grants provider it refuses the call.
 */
export class AccessRulesInvalidException extends AccessControlException {
  declare context: RuntimeException['context'] & { problems: string[] };

  constructor(problems: string[]) {
    super({
      message: 'Access rules are invalid: %s',
      messageParams: [problems.join('; ')],
      fault: 'usage',
    });

    this.errorCode = 'ACCESS_RULES_INVALID_ERROR';

    this.context = {
      ...this.context,
      problems,
    };
  }
}
