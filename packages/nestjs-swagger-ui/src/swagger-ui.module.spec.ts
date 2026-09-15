import { Test, type TestingModule } from '@nestjs/testing';

import { type SwaggerUiSettingsInterface } from './interfaces/swagger-ui-settings.interface';
import { SWAGGER_UI_MODULE_SETTINGS_TOKEN } from './swagger-ui.constants';
import { SwaggerUiModule } from './swagger-ui.module';
import { SwaggerUiService } from './swagger-ui.service';

describe(SwaggerUiModule, () => {
  let module: TestingModule;
  let swaggerUiModule: SwaggerUiModule;
  let swaggerUiService: SwaggerUiService;
  let settings: SwaggerUiSettingsInterface;

  const moduleOptions = { settings: { path: 'api', basePath: '/v1' } };

  describe(SwaggerUiModule.register, () => {
    beforeAll(async () => {
      module = await Test.createTestingModule({
        imports: [SwaggerUiModule.register(moduleOptions)],
      }).compile();

      setVars();
    });

    commonTests();
  });

  describe(SwaggerUiModule.registerAsync, () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          SwaggerUiModule.registerAsync({
            useFactory: () => moduleOptions,
          }),
        ],
      }).compile();

      setVars();
    });

    commonTests();
  });

  describe(SwaggerUiModule.forRoot, () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [SwaggerUiModule.forRoot(moduleOptions)],
      }).compile();

      setVars();
    });

    commonTests();
  });

  describe(SwaggerUiModule.forRootAsync, () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          SwaggerUiModule.forRootAsync({
            useFactory: () => moduleOptions,
          }),
        ],
      }).compile();

      setVars();
    });

    commonTests();
  });

  function setVars() {
    swaggerUiModule = module.get(SwaggerUiModule);
    swaggerUiService = module.get(SwaggerUiService);
    settings = module.get<SwaggerUiSettingsInterface>(
      SWAGGER_UI_MODULE_SETTINGS_TOKEN,
    );
  }

  function commonTests() {
    it('providers should be loaded', async () => {
      expect(swaggerUiModule).toBeInstanceOf(SwaggerUiModule);
      expect(swaggerUiService).toBeInstanceOf(SwaggerUiService);
      expect(settings.path).toEqual('api');
      expect(settings.basePath).toEqual('/v1');
    });
  }
});
