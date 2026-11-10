import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AccessControlModule } from '@concepta/nestjs-access-control';

import { DemoAuthGuard } from '../shared/demo-auth.guard.js';
import { demoRequestOf } from '../shared/demo-request.util.js';

import { PermissionController } from './permission.controller.js';
import { PermissionModule } from './permission.module.js';
import { PermissionStore } from './permission.store.js';
import { ReportController } from './report.controller.js';

const userRoles: Record<string, string[]> = {
  ana: ['analyst'],
  ali: ['analyst'],
  root: ['admin'],
};

@Module({
  imports: [
    PermissionModule,
    AccessControlModule.forRootAsync({
      imports: [PermissionModule],
      inject: [PermissionStore],
      useFactory: (permissions: PermissionStore) => ({
        actorResolver: {
          actorFor: async (_ctx, context) => {
            const user = demoRequestOf(context)?.user;

            return user
              ? {
                  kind: 'role',
                  roles: userRoles[user.id] ?? [],
                  userId: user.id,
                }
              : undefined;
          },
        },
        // Asked on every check, so an edit applies to the next request.
        grantsProvider: {
          rulesFor: async (_ctx, actor) =>
            actor.kind === 'role'
              ? permissions.rulesFor(actor.roles, actor.userId)
              : [],
        },
      }),
    }),
  ],
  controllers: [PermissionController, ReportController],
  providers: [{ provide: APP_GUARD, useClass: DemoAuthGuard }],
})
export class PerUserGrantsModule {}
