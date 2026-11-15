import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AccessControlModule } from '@concepta/nestjs-access-control';

import { DemoAuthGuard } from '../shared/demo-auth.guard.js';
import { demoRequestOf } from '../shared/demo-request.util.js';

import { InvoiceController } from './invoice.controller.js';
import { invoiceGrants, userRoles } from './invoice.grants.js';
import { InvoiceStore } from './invoice.store.js';

@Module({
  imports: [
    AccessControlModule.forRoot({
      settings: { grants: invoiceGrants },
      actorResolver: {
        actorFor: async (_ctx, context) => {
          const user = demoRequestOf(context)?.user;

          return user
            ? { kind: 'role', roles: userRoles[user.id] ?? [], userId: user.id }
            : undefined;
        },
      },
    }),
  ],
  controllers: [InvoiceController],
  providers: [InvoiceStore, { provide: APP_GUARD, useClass: DemoAuthGuard }],
})
export class RoleBasedApiModule {}
