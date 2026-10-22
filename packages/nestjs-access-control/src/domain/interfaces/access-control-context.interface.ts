import { type AccessControl, type IQueryInfo } from 'accesscontrol';

import { type ExecutionContext } from '@nestjs/common';

export interface AccessControlContextInterface {
  getRequest(property?: string): unknown;
  getUser(): unknown;
  getQuery(): IQueryInfo;
  getAccessControl(): AccessControl;
  getExecutionContext(): ExecutionContext;
}
