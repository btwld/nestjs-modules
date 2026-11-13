import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import {
  AccessControlModule,
  type AccessGrants,
} from '@concepta/nestjs-access-control';

import { DemoAuthGuard } from '../shared/demo-auth.guard.js';
import { demoRequestOf } from '../shared/demo-request.util.js';

import { ApiKeyGuard } from './api-key.guard.js';
import { BillingStore } from './billing.store.js';
import { PartnerController } from './partner.controller.js';
import { PaymentEventConsumer } from './payment-event.consumer.js';

const grants: AccessGrants = {
  // The payment provider marks invoices paid, and changes nothing else.
  'system:billing': [
    {
      action: 'update',
      subject: 'invoice',
      fields: ['status', 'paidAt'],
    },
  ],
  // The CRM reads customers, never their card.
  'system:crm': [
    { action: 'read', subject: 'customer' },
    {
      action: 'read',
      subject: 'customer',
      fields: ['cardNumber'],
      inverted: true,
    },
  ],
  // Staff read customers. No role is granted anything on invoices here.
  'role:support': [{ action: 'read', subject: 'customer' }],
};

const userRoles: Record<string, string[]> = {
  // A person whose role happens to be named like a system gets none of
  // that system's grants.
  bill: ['billing'],
  sam: ['support'],
};

@Module({
  imports: [
    AccessControlModule.forRoot({
      settings: { grants },
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
  controllers: [PartnerController],
  providers: [
    BillingStore,
    PaymentEventConsumer,
    { provide: APP_GUARD, useClass: ApiKeyGuard },
    { provide: APP_GUARD, useClass: DemoAuthGuard },
  ],
})
export class SystemIntegrationsModule {}
