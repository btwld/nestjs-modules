import { Test, TestingModule } from '@nestjs/testing';

import { UserModelServiceInterface } from './interfaces/user-model-service.interface';
import { UserModelService } from './services/user-model.service';
import { UserPasswordService } from './services/user-password.service';

import { AppModuleCustomFixture } from './__fixtures__/app.module.custom.fixture';
import { UserModelCustomService } from './__fixtures__/services/user-model.custom.service';
import { UserModuleCustomFixture } from './__fixtures__/user.module.custom.fixture';

describe('AppModule', () => {
  let testModule: TestingModule;
  let userModule: UserModuleCustomFixture;
  let userModelService: UserModelServiceInterface;
  let userModelCustomService: UserModelCustomService;
  let userPasswordService: UserPasswordService;

  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [AppModuleCustomFixture],
    }).compile();

    userModule = testModule.get<UserModuleCustomFixture>(
      UserModuleCustomFixture,
    );
    userModelService = testModule.get<UserModelService>(UserModelService);
    userModelCustomService = testModule.get<UserModelCustomService>(
      UserModelCustomService,
    );
    userPasswordService =
      testModule.get<UserPasswordService>(UserPasswordService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (testModule) await testModule.close();
  });

  describe('module', () => {
    it('should be loaded', async () => {
      expect(userModule).toBeInstanceOf(UserModuleCustomFixture);
      expect(userModelService).toBeInstanceOf(UserModelService);
      expect(userModelCustomService).toBeInstanceOf(UserModelCustomService);
      expect(userPasswordService).toBeInstanceOf(UserPasswordService);
    });
  });
});
