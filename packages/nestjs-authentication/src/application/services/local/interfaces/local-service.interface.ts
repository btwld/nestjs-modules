import { type PlainLiteralObject } from '@nestjs/common';

import { type ReferenceIdInterface } from '@concepta/nestjs-core';

import { type LocalValidateUserInterface } from './local-validate-user.interface.js';

export interface LocalServiceInterface {
  validateUser(
    ctx: PlainLiteralObject,
    dto: LocalValidateUserInterface,
  ): Promise<ReferenceIdInterface>;
}
