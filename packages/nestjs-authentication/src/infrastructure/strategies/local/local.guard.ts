import { Injectable } from '@nestjs/common';

import { AuthGuard } from '../../auth.guard.js';

import { LOCAL_STRATEGY_NAME } from './local.constants.js';

@Injectable()
export class LocalGuard extends AuthGuard(LOCAL_STRATEGY_NAME, {
  canDisable: false,
}) {}
