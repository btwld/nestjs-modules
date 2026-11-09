import supertest from 'supertest';
import { z } from 'zod';

import {
  Controller,
  Get,
  type INestApplication,
  Module,
  UseInterceptors,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { withNamedComponent } from '@concepta/nestjs-core';

import { CrudModule } from '../../../crud.module.js';
import { CrudResponseResource } from '../../decorators/routes/crud-response-resource.decorator.js';
import { CrudSerialize } from '../../decorators/routes/crud-serialize.decorator.js';
import { CrudSerializeInterceptor } from '../crud-serialize.interceptor.js';

const widgetSchema = withNamedComponent(
  z.object({ id: z.string(), name: z.string() }),
  'SerializerSpecWidget',
);

const gadgetSchema = withNamedComponent(
  z.object({ id: z.string(), title: z.string() }),
  'SerializerSpecGadget',
);

@Controller('widgets')
@CrudResponseResource(widgetSchema)
@CrudSerialize({})
@UseInterceptors(CrudSerializeInterceptor)
class WidgetsController {
  @Get('valid')
  valid() {
    return { id: '1', name: 'a', secret: 'strip-me' };
  }

  @Get('invalid')
  invalid() {
    // missing `name` — does not match widgetSchema
    return { id: '1' };
  }

  // shares the class-level `@CrudSerialize({})` metadata object with every
  // other handler above — only its response resource is overridden
  @Get('gadget')
  @CrudResponseResource(gadgetSchema)
  gadget() {
    return { id: '1', title: 'g' };
  }
}

@Module({
  imports: [CrudModule.forRoot({})],
  controllers: [WidgetsController],
  providers: [],
})
class WidgetsModuleFixture {}

describe('CrudSerializeInterceptor schema path (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [WidgetsModuleFixture],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    return app ? await app.close() : undefined;
  });

  it('shapes a valid response, stripping fields not in the schema', async () => {
    const res = await supertest(app.getHttpServer()).get('/widgets/valid');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: '1', name: 'a' });
  });

  it('fails closed with a normalized 500 (not a raw Error) when the response does not match its schema', async () => {
    const res = await supertest(app.getHttpServer()).get('/widgets/invalid');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      statusCode: 500,
      message: 'Internal Server Error',
      error: 'Internal Server Error',
      errorCode: 'CRUD_ERROR',
    });
  });

  it('does not leak a resolved response resource across handlers sharing one class-level @CrudSerialize object', async () => {
    // resolves and (pre-fix) would mutate the shared class-level metadata
    // object with `resource: widgetSchema`
    const first = await supertest(app.getHttpServer()).get('/widgets/valid');
    expect(first.status).toBe(200);

    // this handler overrides the response resource at method level; if the
    // previous request's resolution had leaked into the shared object, this
    // would incorrectly serialize against widgetSchema instead of
    // gadgetSchema and fail closed with a 500
    const second = await supertest(app.getHttpServer()).get('/widgets/gadget');
    expect(second.status).toBe(200);
    expect(second.body).toEqual({ id: '1', title: 'g' });
  });
});
