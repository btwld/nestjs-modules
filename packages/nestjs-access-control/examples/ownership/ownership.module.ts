import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import {
  AccessControlModule,
  type AccessGrants,
} from '@concepta/nestjs-access-control';

import { DemoAuthGuard } from '../shared/demo-auth.guard.js';
import { demoRequestOf } from '../shared/demo-request.util.js';

import { DocumentController } from './document.controller.js';
import { DocumentStore } from './document.store.js';
import { OwnDocumentQuery } from './own-document.query.js';

const grants: AccessGrants = {
  // Members read and edit their own documents, but cannot give one away.
  'role:member': [
    { action: ['read:own', 'update:own'], subject: 'document' },
    {
      action: 'update:own',
      subject: 'document',
      fields: ['ownerId'],
      inverted: true,
    },
  ],
  // Managers read everyone's, and change none.
  'role:manager': [{ action: 'read:any', subject: 'document' }],
  // Admins read and edit everyone's, owner included.
  'role:admin': [{ action: ['read:any', 'update:any'], subject: 'document' }],
};

const userRoles: Record<string, string[]> = {
  maya: ['member'],
  max: ['member'],
  mia: ['manager'],
  ola: ['admin'],
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
  controllers: [DocumentController],
  providers: [
    DocumentStore,
    // Registered here rather than in `queryServices`, so it can inject the
    // store: the route guard finds it in any module.
    OwnDocumentQuery,
    { provide: APP_GUARD, useClass: DemoAuthGuard },
  ],
})
export class OwnershipModule {}
