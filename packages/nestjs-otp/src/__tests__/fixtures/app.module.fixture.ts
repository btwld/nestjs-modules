import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

import { OtpModule } from '../../otp.module.js';

import { UserEntityFixture } from './entities/user-entity.fixture.js';
import { UserOtpEntityFixture } from './entities/user-otp-entity.fixture.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      entities: [UserEntityFixture, UserOtpEntityFixture],
    }),
    RepositoryModule.forRoot({}),
    RepositoryModule.forFeature({
      module: TypeOrmRepositoryModule,
      entities: [
        {
          key: 'userOtp',
          entity: UserOtpEntityFixture,
        },
      ],
    }),
    OtpModule.forRoot({}),
    OtpModule.forFeature(['userOtp']),
  ],
})
export class AppModuleFixture {}
