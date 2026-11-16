import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { AuthenticationModule } from '../../authentication.module.js';

@Module({
  imports: [
    CqrsModule,
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
      },
    }),
  ],
  exports: [CqrsModule],
})
export class AppModuleFixture {}
