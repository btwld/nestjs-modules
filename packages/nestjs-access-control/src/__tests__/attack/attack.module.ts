import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthenticationModule } from '@concepta/nestjs-authentication';
import { CoreModule } from '@concepta/nestjs-core';
import { CrudModule } from '@concepta/nestjs-crud';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { CaslAuthority } from '@concepta/nestjs-repository/optional/casl';
import { TypeOrmSqliteRepositoryModule } from '@concepta/nestjs-repository-typeorm/sqlite';

import { AccessControlModule } from '../../access-control.module.js';
import { AccessControlService } from '../../domain/services/access-control.service.js';
import { AccessControlCrudPolicy } from '../../gateways/http/access-control-crud.policy.js';

import { AttackActorResolver, AttackTenantOverlay } from './attack-identity.js';
import {
  attackOtpPortSettings,
  attackPasswordPortSettings,
  attackRecoveryNotificationPortSettings,
  attackUserPortHandlers,
  attackUserPortSettings,
  attackVerifyNotificationPortSettings,
} from './attack-user.port.js';
import { AttackUserStore } from './attack-user.store.js';
import {
  AttackDeskController,
  AttackHealthController,
} from './attack.controller.js';
import {
  controllers,
  customerInvoiceRoutes,
  providers,
  strictInvoiceRoutes,
} from './attack.crud.js';
import {
  AttackCustomerEntity,
  AttackInvoiceEntity,
  AttackInvoiceLineEntity,
} from './attack.entities.js';
import {
  AttackAuthorityModule,
  AttackTenantRowScope,
  CUSTOMER,
  INVOICE,
  INVOICE_LINE,
  REPORT,
  ROUTE_GRANTS,
} from './attack.rules.js';

export const ATTACK_JWT_ACCESS_SECRET =
  'attack-access-secret-at-least-32-chars';
const ATTACK_JWT_REFRESH_SECRET = 'attack-refresh-secret-at-least-32-chars';

/** The user table, and the port handlers authentication looks users up by. */
@Global()
@Module({
  imports: [CqrsModule],
  providers: [AttackUserStore, AttackActorResolver, ...attackUserPortHandlers],
  exports: [AttackUserStore, AttackActorResolver],
})
export class AttackUserModule {}

@Module({
  imports: [RepositoryModule.forFeature([INVOICE])],
  controllers: [
    ...Object.values(controllers),
    ...Object.values(customerInvoiceRoutes.controllers),
    ...Object.values(strictInvoiceRoutes.controllers),
    AttackDeskController,
    AttackHealthController,
  ],
  providers: [
    ...providers,
    ...customerInvoiceRoutes.providers,
    ...strictInvoiceRoutes.providers,
  ],
})
export class AttackRoutesModule {}

const GOVERNED = { access: 'governed', authority: CaslAuthority } as const;
const TENANT = { access: 'scoped', resolver: AttackTenantRowScope } as const;

/**
 * The application under attack: real bearer-token sign-in, one authority
 * shared by the repository and the routes, tenants by row scope, generated
 * and hand-written routes, and the route audit on.
 */
@Module({
  imports: [
    CoreModule.forRoot({
      routeAudit: {
        allow: { requireAcl: ['GET /desk/me/permissions'] },
      },
    }),
    AttackUserModule,
    AuthenticationModule.forRoot({
      settings: {
        jwt: {
          access: {
            secret: ATTACK_JWT_ACCESS_SECRET,
            signOptions: { expiresIn: '15m' },
          },
          refresh: {
            secret: ATTACK_JWT_REFRESH_SECRET,
            signOptions: { expiresIn: '7d' },
          },
        },
        strategies: { jwt: {} },
      },
      ports: {
        user: attackUserPortSettings,
        password: attackPasswordPortSettings,
        otp: attackOtpPortSettings,
        recoveryNotification: attackRecoveryNotificationPortSettings,
        verifyNotification: attackVerifyNotificationPortSettings,
      },
    }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: ':memory:',
      synchronize: true,
      entities: [
        AttackCustomerEntity,
        AttackInvoiceEntity,
        AttackInvoiceLineEntity,
      ],
    }),
    RepositoryModule.forRoot({
      imports: [AttackAuthorityModule],
      drivers: [
        {
          driver: TypeOrmSqliteRepositoryModule,
          entities: [
            {
              key: CUSTOMER,
              entity: AttackCustomerEntity,
              authority: GOVERNED,
            },
            {
              key: INVOICE,
              entity: AttackInvoiceEntity,
              authority: GOVERNED,
              rowScope: TENANT,
              relations: { lines: { cascade: true } },
            },
            {
              key: INVOICE_LINE,
              entity: AttackInvoiceLineEntity,
              authority: GOVERNED,
              rowScope: TENANT,
            },
          ],
        },
      ],
    }),
    AccessControlModule.forRootAsync({
      imports: [AttackAuthorityModule, AttackUserModule],
      inject: [CaslAuthority, AttackActorResolver],
      useFactory: (
        authority: CaslAuthority,
        actorResolver: AttackActorResolver,
      ) => ({
        authority: { authority, except: [REPORT] },
        settings: { grants: ROUTE_GRANTS },
        actorResolver,
      }),
    }),
    CrudModule.forRootAsync({
      inject: [AccessControlService],
      useFactory: (accessControl: AccessControlService) => ({
        requestPolicy: new AccessControlCrudPolicy(accessControl),
      }),
    }),
    AttackRoutesModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: AttackTenantOverlay }],
})
export class AttackModule {}
