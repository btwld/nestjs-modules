import { type ExecutionContext } from '@nestjs/common';

export interface AccessControlServiceInterface {
  getUser(context: ExecutionContext): Promise<unknown>;
  getUserRoles(context: ExecutionContext): Promise<string | string[]>;
}
