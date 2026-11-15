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

/** A subject whose lookup fails, as it would while the user store is down. */
export const FAILING_LOOKUP_SUBJECT = 'failing-lookup-subject';

@QueryHandler(MockGetUserBySubjectQuery)
class GetUserBySubjectHandler {
  async execute(query: MockGetUserBySubjectQuery) {
    if (query.subject === FAILING_LOOKUP_SUBJECT) {
      throw new Error('the user store is down');
    }
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
