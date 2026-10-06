import { HttpStatus } from '@nestjs/common';

import { type RuntimeException } from '@concepta/nestjs-core';

import { TokenException } from './token.exception.js';

export class TokenAlreadyRevokedException extends TokenException {
  declare context: RuntimeException['context'] & { tokenId: string };

  constructor(tokenId: string) {
    super({
      httpStatus: HttpStatus.CONFLICT,
      message: 'Token %s has already been revoked',
      messageParams: [tokenId],
      fault: 'client',
    });
    this.errorCode = 'TOKEN_ALREADY_REVOKED_ERROR';
    this.context = { ...this.context, tokenId };
  }
}
