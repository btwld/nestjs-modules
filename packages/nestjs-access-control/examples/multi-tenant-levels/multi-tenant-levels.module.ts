import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AccessControlModule } from '@concepta/nestjs-access-control';

import { DemoAuthGuard } from '../shared/demo-auth.guard.js';
import { demoRequestOf } from '../shared/demo-request.util.js';

import { levelGrants } from './level-rules.util.js';
import { OwnProjectQuery } from './own-project.query.js';
import { ProjectStore } from './project.store.js';
import { MEMBERSHIPS, ROLE_LEVELS } from './tenant-directory.js';
import { TenantController } from './tenant.controller.js';

@Module({
  imports: [
    AccessControlModule.forRoot({
      settings: { grants: levelGrants(ROLE_LEVELS) },
      actorResolver: {
        // The caller's roles are the ones they hold in the tenant the
        // route names, so the same person is a manager in one tenant and
        // a guest in another.
        actorFor: async (_ctx, context) => {
          const request = demoRequestOf(context);
          const user = request?.user;
          const tenantId = request?.params.tenantId;

          if (!user) {
            return undefined;
          }

          const role = tenantId ? MEMBERSHIPS[user.id]?.[tenantId] : undefined;

          return { kind: 'role', roles: role ? [role] : [], userId: user.id };
        },
      },
    }),
  ],
  controllers: [TenantController],
  providers: [
    ProjectStore,
    OwnProjectQuery,
    { provide: APP_GUARD, useClass: DemoAuthGuard },
  ],
})
export class MultiTenantLevelsModule {}
