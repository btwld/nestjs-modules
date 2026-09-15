import { Global, Module } from '@nestjs/common';
import { CqrsModule, QueryHandler } from '@nestjs/cqrs';

import {
  MockGetUserByIdHandler,
  MockGetUserByEmailHandler,
  MockGetUserByUsernameHandler,
  MockGetUserBySubjectQuery,
  MockUpdateUserHandler,
} from './ports/mock-user-port.provider.js';

export const FIXTURE_USER = {
  id: 'fixture-user-id',
  active: true,
};

@QueryHandler(MockGetUserBySubjectQuery)
class GetUserBySubjectHandler {
  async execute() {
    return FIXTURE_USER;
  }
}

// AUTHENTICATION_USER_PORT_TOKEN is provided by AuthenticationModule itself
// via `ports.user` (see AppModuleFixture) — this module only supplies the
// CQRS handlers that UserPort dispatches to.
@Global()
@Module({
  imports: [CqrsModule],
  providers: [
    MockGetUserByIdHandler,
    GetUserBySubjectHandler,
    MockGetUserByUsernameHandler,
    MockGetUserByEmailHandler,
    MockUpdateUserHandler,
  ],
})
export class UserModuleFixture {}
