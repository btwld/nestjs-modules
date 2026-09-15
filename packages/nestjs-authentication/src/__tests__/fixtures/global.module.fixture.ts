import { Global, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { AUTHENTICATION_USER_PORT_TOKEN } from '../../authentication.constants.js';

import {
  createMockUserPortProvider,
  mockUserPortHandlers,
} from './ports/mock-user-port.provider.js';

@Global()
@Module({
  imports: [CqrsModule],
  providers: [createMockUserPortProvider(), ...mockUserPortHandlers],
  exports: [AUTHENTICATION_USER_PORT_TOKEN],
})
export class GlobalModuleFixture {}
