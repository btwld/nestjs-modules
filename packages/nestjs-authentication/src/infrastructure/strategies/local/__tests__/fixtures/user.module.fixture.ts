import { Global, Module } from '@nestjs/common';
import { CqrsModule, QueryHandler } from '@nestjs/cqrs';

import { mockPasswordPortHandlers } from '../../../../../__tests__/fixtures/ports/mock-password-port.provider.js';
import {
  MockGetUserByIdHandler,
  MockGetUserByEmailHandler,
  MockGetUserBySubjectQuery,
  MockGetUserByUsernameQuery,
  MockUpdateUserHandler,
} from '../../../../../__tests__/fixtures/ports/mock-user-port.provider.js';

import { USER_SUCCESS } from './constants.js';

@QueryHandler(MockGetUserByUsernameQuery)
class GetUserByUsernameHandler {
  async execute(query: MockGetUserByUsernameQuery) {
    return query.username === USER_SUCCESS.username ? USER_SUCCESS : null;
  }
}

@QueryHandler(MockGetUserBySubjectQuery)
class GetUserBySubjectHandler {
  async execute() {
    return USER_SUCCESS;
  }
}

// AUTHENTICATION_USER_PORT_TOKEN / AUTHENTICATION_PASSWORD_PORT_TOKEN are
// provided by AuthenticationModule itself via `ports.user`/`ports.password`
// (see AppModuleFixture) — this module only supplies the CQRS handlers that
// UserPort/PasswordPort dispatch to.
@Global()
@Module({
  imports: [CqrsModule],
  providers: [
    // user port handlers (override username + subject lookups)
    MockGetUserByIdHandler,
    GetUserByUsernameHandler,
    GetUserBySubjectHandler,
    MockGetUserByEmailHandler,
    MockUpdateUserHandler,
    // password port handlers
    ...mockPasswordPortHandlers,
  ],
})
export class UserModuleFixture {}
