import { type AccessControl, type IQueryInfo } from 'accesscontrol';

import { type ExecutionContext } from '@nestjs/common';

export interface AccessControlContextArgsInterface {
  user: unknown;
  request: unknown;
  query: IQueryInfo;
  accessControl: AccessControl;
  executionContext: ExecutionContext;
}
