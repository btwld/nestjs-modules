import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { SwaggerUiModule } from './swagger-ui.module';
import { SwaggerUiService } from './swagger-ui.service';

describe('SwaggerModule (e2e)', () => {
  let module: TestingModule;
  let app: INestApplication;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        SwaggerUiModule.register({
          settings: { path: '/api', basePath: '/v1' },
        }),
      ],
    }).compile();
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('setup', async () => {
    app = module.createNestApplication();
    const swaggerUiService = app.get(SwaggerUiService);
    expect(swaggerUiService).toBeInstanceOf(SwaggerUiService);
    swaggerUiService.setup(app);
  });
});
