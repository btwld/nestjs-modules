import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Operation } from '@concepta/nestjs-core';
import { CrudCqrsResolver, CrudModule } from '@concepta/nestjs-crud';
import {
  CreateOtpCommand,
  ConsumeOtpCommand,
  ClearOtpsCommand,
  ValidateOtpQuery,
  OtpModule,
} from '@concepta/nestjs-otp';
import {
  PasswordModule,
  CreatePasswordCommand,
  ValidateCurrentPasswordCommand,
} from '@concepta/nestjs-password';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';
import {
  GetUserQuery,
  GetUserByEmailQuery,
  UserModule,
} from '@concepta/nestjs-user';

import { InvitationInterface } from '../../../../domain/interfaces/invitation.interface.js';
import { invitationCreateSchema } from '../../../../infrastructure/schemas/invitation-create.schema.js';
import { invitationPaginatedSchema } from '../../../../infrastructure/schemas/invitation-paginated.schema.js';
import { invitationSchema } from '../../../../infrastructure/schemas/invitation.schema.js';
import { INVITATION_MODULE_DEFAULT_ENTITY_KEY } from '../../../../invitation.constants.js';
import { InvitationModule } from '../../../../invitation.module.js';
import { AcceptInvitationRequestHandler } from '../../commands/handlers/accept-invitation-request.handler.js';
import { CreateInvitationRequestHandler } from '../../commands/handlers/create-invitation-request.handler.js';
import { DeleteInvitationRequestHandler } from '../../commands/handlers/delete-invitation-request.handler.js';
import { CreateInvitationRequest } from '../../commands/impl/create-invitation.request.js';
import { DeleteInvitationRequest } from '../../commands/impl/delete-invitation.request.js';
import { ListInvitationsRequestHandler } from '../../queries/handlers/list-invitations-request.handler.js';
import { ReadInvitationRequestHandler } from '../../queries/handlers/read-invitation-request.handler.js';
import { ListInvitationsRequest } from '../../queries/impl/list-invitations.request.js';
import { ReadInvitationRequest } from '../../queries/impl/read-invitation.request.js';

import { InvitationEntityFixture } from './entities/invitation.entity.fixture.js';
import { UserCredentialEntityFixture } from './entities/user-credential.entity.fixture.js';
import { UserOtpEntityFixture } from './entities/user-otp.entity.fixture.js';
import { UserEntityFixture } from './entities/user.entity.fixture.js';
import { InvitationAcceptanceController } from './invitation-acceptance.controller.js';
import {
  NoopSendInvitationNotificationCommand,
  NoopSendAcceptedNotificationCommand,
} from './notification/noop-notification.command.js';
import {
  NoopSendInvitationNotificationHandler,
  NoopSendAcceptedNotificationHandler,
} from './notification/noop-notification.handler.js';

const USER_ENTITY_KEY = 'user';
const USER_CREDENTIALS_ENTITY_KEY = 'user-credentials';
const USER_OTP_ENTITY_KEY = 'user-otp';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      entities: [
        InvitationEntityFixture,
        UserEntityFixture,
        UserCredentialEntityFixture,
        UserOtpEntityFixture,
      ],
    }),
    CqrsModule.forRoot(),
    RepositoryModule.forRoot({}),
    CrudModule.forRoot({
      defaultResolver: CrudCqrsResolver,
    }),
    RepositoryModule.forFeature({
      module: TypeOrmRepositoryModule,
      entities: [
        {
          key: INVITATION_MODULE_DEFAULT_ENTITY_KEY,
          entity: InvitationEntityFixture,
        },
        { key: USER_ENTITY_KEY, entity: UserEntityFixture },
        {
          key: USER_CREDENTIALS_ENTITY_KEY,
          entity: UserCredentialEntityFixture,
        },
        { key: USER_OTP_ENTITY_KEY, entity: UserOtpEntityFixture },
      ],
    }),
    PasswordModule.forRoot({}),
    OtpModule.forRoot({}),
    OtpModule.forFeature([USER_OTP_ENTITY_KEY]),
    UserModule.forRoot({
      entities: {
        user: USER_ENTITY_KEY,
        credentials: USER_CREDENTIALS_ENTITY_KEY,
      },
      ports: {
        password: {
          createCommand: CreatePasswordCommand,
          validateCurrentCommand: ValidateCurrentPasswordCommand,
        },
      },
    }),
    InvitationModule.registerAsync({
      useFactory: () => ({
        ports: {
          otp: {
            createCommand: CreateOtpCommand,
            consumeCommand: ConsumeOtpCommand,
            clearCommand: ClearOtpsCommand,
            validateQuery: ValidateOtpQuery,
          },
          user: {
            getByIdQuery: GetUserQuery,
            getByEmailQuery: GetUserByEmailQuery,
          },
          notification: {
            sendInvitationCommand: NoopSendInvitationNotificationCommand,
            sendAcceptedCommand: NoopSendAcceptedNotificationCommand,
          },
        },
      }),
    }),
    CrudModule.forFeature<InvitationInterface>({
      crud: {
        controller: {
          entity: INVITATION_MODULE_DEFAULT_ENTITY_KEY,
          path: 'invitation',
          resolver: CrudCqrsResolver,
          transactional: true,
          request: { body: invitationCreateSchema },
          response: {
            resource: invitationSchema,
            paginated: invitationPaginatedSchema,
          },
        },
        operations: [
          {
            operation: Operation.List,
            query: ListInvitationsRequest,
            queryHandler: ListInvitationsRequestHandler,
          },
          {
            operation: Operation.Read,
            query: ReadInvitationRequest,
            queryHandler: ReadInvitationRequestHandler,
          },
          {
            operation: Operation.Create,
            request: { body: invitationCreateSchema },
            command: CreateInvitationRequest,
            commandHandler: CreateInvitationRequestHandler,
          },
          {
            operation: Operation.Delete,
            command: DeleteInvitationRequest,
            commandHandler: DeleteInvitationRequestHandler,
          },
        ],
      },
    }),
  ],
  providers: [
    NoopSendInvitationNotificationHandler,
    NoopSendAcceptedNotificationHandler,
    AcceptInvitationRequestHandler,
  ],
  controllers: [InvitationAcceptanceController],
})
export class AppCrudModuleFixture {}
