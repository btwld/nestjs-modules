import { Module } from '@nestjs/common';

import { PermissionStore } from './permission.store.js';

@Module({
  providers: [PermissionStore],
  exports: [PermissionStore],
})
export class PermissionModule {}
