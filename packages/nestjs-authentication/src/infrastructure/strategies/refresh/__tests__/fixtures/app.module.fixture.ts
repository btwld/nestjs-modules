import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { mockPasswordPortSettings } from '../../../../../__tests__/fixtures/ports/mock-password-port.provider.js';
import { mockUserPortSettings } from '../../../../../__tests__/fixtures/ports/mock-user-port.provider.js';
import {
  stubOtpPortSettings,
  stubRecoveryNotificationPortSettings,
  stubVerifyNotificationPortSettings,
} from '../../../../../__tests__/fixtures/ports/stub-unused-ports.fixture.js';
import { UserModuleFixture } from '../../../../../__tests__/fixtures/user.module.fixture.js';
import { AuthenticationModule } from '../../../../../authentication.module.js';

import { RefreshControllerFixture } from './refresh.controller.fixture.js';

@Module({
  imports: [
    CqrsModule,
    UserModuleFixture,
    AuthenticationModule.forRoot({
      appGuard: false,
      settings: {
        jwt: {
          access: {
            secret: 'test-access-secret',
            signOptions: { expiresIn: '1h' },
          },
          refresh: {
            secret: 'test-refresh-secret',
            signOptions: { expiresIn: '7d' },
          },
        },
        strategies: {
          refresh: {},
        },
      },
      ports: {
        user: mockUserPortSettings,
        password: mockPasswordPortSettings,
        otp: stubOtpPortSettings,
        recoveryNotification: stubRecoveryNotificationPortSettings,
        verifyNotification: stubVerifyNotificationPortSettings,
      },
    }),
  ],
  controllers: [RefreshControllerFixture],
  exports: [CqrsModule],
})
export class AppModuleFixture {}
