import { Test, type TestingModule } from '@nestjs/testing';

import { AuthJwtModule } from '@concepta/nestjs-auth-jwt';
import { AuthenticationModule } from '@concepta/nestjs-authentication';
import { CrudModule } from '@concepta/nestjs-crud';
import { FederatedModule } from '@concepta/nestjs-federated';
import { JwtModule } from '@concepta/nestjs-jwt';
import { PasswordModule } from '@concepta/nestjs-password';
import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';
import { UserModule, UserModelService } from '@concepta/nestjs-user';

import { AuthGoogleModule } from './auth-google.module';

import { FederatedEntityFixture } from './__fixtures__/federated-entity.fixture';
import { UserEntityFixture } from './__fixtures__/user.entity.fixture';

describe(AuthGoogleModule, () => {
  let authGoogleModule: AuthGoogleModule;

  describe(AuthGoogleModule.forRoot, () => {
    it('module should be loaded', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          TypeOrmExtModule.forRoot({
            type: 'sqlite',
            database: ':memory:',
            entities: [UserEntityFixture, FederatedEntityFixture],
          }),
          JwtModule.forRoot({}),
          AuthGoogleModule.forRoot({}),
          AuthenticationModule.forRoot({}),
          AuthJwtModule.forRootAsync({
            inject: [UserModelService],
            useFactory: (userModelService) => ({
              userModelService,
            }),
          }),
          FederatedModule.forRootAsync({
            imports: [
              TypeOrmExtModule.forFeature({
                federated: {
                  entity: FederatedEntityFixture,
                },
              }),
            ],
            inject: [UserModelService],
            useFactory: (userModelService) => ({
              userModelService,
            }),
          }),
          CrudModule.forRoot({}),
          PasswordModule.forRoot({}),
          UserModule.forRootAsync({
            imports: [
              TypeOrmExtModule.forFeature({
                user: {
                  entity: UserEntityFixture,
                },
              }),
            ],
            useFactory: () => ({}),
          }),
        ],
      }).compile();

      authGoogleModule = module.get(AuthGoogleModule);

      expect(authGoogleModule).toBeInstanceOf(AuthGoogleModule);
    });
  });
});
