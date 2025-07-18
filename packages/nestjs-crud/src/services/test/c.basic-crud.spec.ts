import request from 'supertest';
import { DataSource } from 'typeorm';

import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';

import { ExceptionsFilter } from '@concepta/nestjs-common';

import { CompanyCrudService } from '../../__fixtures__/typeorm/company/company-crud.service';
import { CompanyTypeOrmCrudAdapter } from '../../__fixtures__/typeorm/company/company-typeorm-crud.adapter';
import { CompanyEntity } from '../../__fixtures__/typeorm/company/company.entity';
import { CompanyCreateManyDto } from '../../__fixtures__/typeorm/company/dto/company-create-many.dto';
import { CompanyCreateDto } from '../../__fixtures__/typeorm/company/dto/company-create.dto';
import { CompanyPaginatedDto } from '../../__fixtures__/typeorm/company/dto/company-paginated.dto';
import { CompanyUpdateDto } from '../../__fixtures__/typeorm/company/dto/company-update.dto';
import { CompanyDto } from '../../__fixtures__/typeorm/company/dto/company.dto';
import { DeviceCrudService } from '../../__fixtures__/typeorm/device/device-crud.service';
import { DeviceTypeOrmCrudAdapter } from '../../__fixtures__/typeorm/device/device-typeorm-crud.adapter';
import { DeviceEntity } from '../../__fixtures__/typeorm/device/device.entity';
import { DeviceCreateDto } from '../../__fixtures__/typeorm/device/dto/device-create.dto';
import { DeviceDto } from '../../__fixtures__/typeorm/device/dto/device.dto';
import { ormSqliteConfig } from '../../__fixtures__/typeorm/orm.sqlite.config';
import { ProjectEntity } from '../../__fixtures__/typeorm/project/project.entity';
import { Seeds } from '../../__fixtures__/typeorm/seeds';
import { UserEntity } from '../../__fixtures__/typeorm/users/user.entity';
import { CrudCreateMany } from '../../crud/decorators/actions/crud-create-many.decorator';
import { CrudCreateOne } from '../../crud/decorators/actions/crud-create-one.decorator';
import { CrudDeleteOne } from '../../crud/decorators/actions/crud-delete-one.decorator';
import { CrudGetMany } from '../../crud/decorators/actions/crud-get-many.decorator';
import { CrudGetOne } from '../../crud/decorators/actions/crud-get-one.decorator';
import { CrudRecoverOne } from '../../crud/decorators/actions/crud-recover-one.decorator';
import { CrudReplaceOne } from '../../crud/decorators/actions/crud-replace-one.decorator';
import { CrudUpdateOne } from '../../crud/decorators/actions/crud-update-one.decorator';
import { CrudController } from '../../crud/decorators/controller/crud-controller.decorator';
import { CrudBody } from '../../crud/decorators/params/crud-body.decorator';
import { CrudRequest } from '../../crud/decorators/params/crud-request.decorator';
import { CrudAlwaysPaginate } from '../../crud/decorators/routes/crud-always-paginate.decorator';
import { CrudLimit } from '../../crud/decorators/routes/crud-limit.decorator';
import { CrudSoftDelete } from '../../crud/decorators/routes/crud-soft-delete.decorator';
import { CrudRequestInterface } from '../../crud/interfaces/crud-request.interface';
import { CrudModule } from '../../crud.module';
import { CrudRequestQueryBuilder } from '../../request/crud-request-query.builder';

const isMysql = process.env.TYPEORM_CONNECTION === 'mysql';

// tslint:disable:max-classes-per-file no-shadowed-variable
describe('#crud-typeorm', () => {
  describe('#basic crud using alwaysPaginate default respects global limit', () => {
    let app: INestApplication;
    let server: ReturnType<INestApplication['getHttpServer']>;

    @CrudController({
      path: 'companies0',
      model: {
        type: CompanyDto,
        paginatedType: CompanyPaginatedDto,
      },
    })
    @CrudLimit(3)
    @CrudAlwaysPaginate(true)
    class CompaniesController0 {
      constructor(public service: CompanyCrudService) {}

      @CrudGetMany()
      getMany(@CrudRequest() request: CrudRequestInterface) {
        return this.service.getMany(request);
      }
    }

    beforeAll(async () => {
      const fixture = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot(ormSqliteConfig),
          TypeOrmModule.forFeature([CompanyEntity]),
          CrudModule.forRoot({}),
        ],
        controllers: [CompaniesController0],
        providers: [
          { provide: APP_FILTER, useClass: ExceptionsFilter },
          CompanyTypeOrmCrudAdapter,
          CompanyCrudService,
        ],
      }).compile();

      app = fixture.createNestApplication();

      await app.init();
      server = app.getHttpServer();

      const datasource = app.get<DataSource>(getDataSourceToken());
      const seeds = new Seeds();
      await seeds.up(datasource.createQueryRunner());
    });

    afterAll(async () => {
      await app.close();
    });

    describe('#getAll', () => {
      it('should return an array of all entities', (done) => {
        request(server)
          .get('/companies0')
          .end((_, res) => {
            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(3);
            expect(res.body.page).toBe(1);
            done();
          });
      });
    });
  });

  describe('#basic crud using alwaysPaginate default', () => {
    let app: INestApplication;
    let server: ReturnType<INestApplication['getHttpServer']>;
    let qb: CrudRequestQueryBuilder;

    @CrudController({
      path: 'companies',
      model: {
        type: CompanyDto,
        paginatedType: CompanyPaginatedDto,
      },
    })
    @CrudAlwaysPaginate(true)
    class CompaniesController {
      constructor(public service: CompanyCrudService) {}

      @CrudGetMany()
      getMany(@CrudRequest() request: CrudRequestInterface) {
        return this.service.getMany(request);
      }
    }

    beforeAll(async () => {
      const fixture = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot(ormSqliteConfig),
          TypeOrmModule.forFeature([CompanyEntity]),
          CrudModule.forRoot({}),
        ],
        controllers: [CompaniesController],
        providers: [
          { provide: APP_FILTER, useClass: ExceptionsFilter },
          CompanyTypeOrmCrudAdapter,
          CompanyCrudService,
        ],
      }).compile();

      app = fixture.createNestApplication();

      await app.init();
      server = app.getHttpServer();

      const datasource = app.get<DataSource>(getDataSourceToken());
      const seeds = new Seeds();
      await seeds.up(datasource.createQueryRunner());
    });

    beforeEach(() => {
      qb = CrudRequestQueryBuilder.create();
    });

    afterAll(async () => {
      await app.close();
    });

    describe('#getAll', () => {
      it('should return an array of all entities', (done) => {
        request(server)
          .get('/companies')
          .end((_, res) => {
            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(9);
            expect(res.body.page).toBe(1);
            done();
          });
      });
      it('should return an entities with limit', (done) => {
        const query = qb.setLimit(5).query();
        request(server)
          .get('/companies')
          .query(query)
          .end((_, res) => {
            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(5);
            expect(res.body.page).toBe(1);
            done();
          });
      });
      it('should return an entities with limit and page', (done) => {
        const query = qb
          .setLimit(3)
          .setPage(1)
          .sortBy({ field: 'id', order: 'DESC' })
          .query();
        request(server)
          .get('/companies')
          .query(query)
          .end((_, res) => {
            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(3);
            expect(res.body.count).toBe(3);
            expect(res.body.page).toBe(1);
            done();
          });
      });
    });
  });

  describe('#basic crud', () => {
    let app: INestApplication;
    let server: ReturnType<INestApplication['getHttpServer']>;
    let qb: CrudRequestQueryBuilder;

    @CrudController({
      path: 'companies',
      model: {
        type: CompanyDto,
        paginatedType: CompanyPaginatedDto,
      },
      params: {
        id: {
          field: 'id',
          type: 'number',
          primary: true,
        },
      },
      // query: {
      //   softDelete: true,
      // },
    })
    @CrudSoftDelete(true)
    class CompaniesController {
      constructor(public service: CompanyCrudService) {}

      @CrudGetMany()
      getMany(@CrudRequest() request: CrudRequestInterface) {
        return this.service.getMany(request);
      }

      @CrudGetOne()
      getOne(@CrudRequest() request: CrudRequestInterface) {
        return this.service.getOne(request);
      }

      @CrudCreateOne()
      createOne(
        @CrudRequest() request: CrudRequestInterface,
        @CrudBody() dto: CompanyCreateDto,
      ) {
        return this.service.createOne(request, dto);
      }

      @CrudCreateMany({ path: 'bulk' })
      createMany(
        @CrudRequest() request: CrudRequestInterface,
        @CrudBody() dto: CompanyCreateManyDto,
      ) {
        return this.service.createMany(request, dto);
      }

      @CrudUpdateOne()
      updateOne(
        @CrudRequest() request: CrudRequestInterface,
        @CrudBody() dto: CompanyUpdateDto,
      ) {
        return this.service.updateOne(request, dto);
      }

      @CrudReplaceOne()
      replaceOne(
        @CrudRequest() request: CrudRequestInterface,
        @CrudBody() dto: CompanyCreateDto,
      ) {
        return this.service.replaceOne(request, dto);
      }

      @CrudDeleteOne({ returnDeleted: true })
      deleteOne(@CrudRequest() request: CrudRequestInterface) {
        return this.service.deleteOne(request);
      }

      @CrudRecoverOne({ path: ':id/recover' })
      recoverOne(@CrudRequest() request: CrudRequestInterface) {
        return this.service.recoverOne(request);
      }
    }

    @CrudController({
      path: 'devices',
      model: { type: DeviceDto },
      params: {
        deviceKey: {
          field: 'deviceKey',
          type: 'uuid',
          primary: true,
        },
      },
    })
    class DevicesController {
      constructor(public service: DeviceCrudService) {}

      @CrudCreateOne({ returnShallow: true })
      createOne(
        @CrudRequest() request: CrudRequestInterface,
        @CrudBody() dto: DeviceCreateDto,
      ) {
        return this.service.createOne(request, dto);
      }
    }

    beforeAll(async () => {
      const fixture = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({ ...ormSqliteConfig, logging: false }),
          TypeOrmModule.forFeature([
            CompanyEntity,
            ProjectEntity,
            UserEntity,
            DeviceEntity,
          ]),
          CrudModule.forRoot({}),
        ],
        controllers: [CompaniesController, DevicesController],
        providers: [
          { provide: APP_FILTER, useClass: ExceptionsFilter },
          CompanyTypeOrmCrudAdapter,
          CompanyCrudService,
          DeviceTypeOrmCrudAdapter,
          DeviceCrudService,
        ],
      }).compile();

      app = fixture.createNestApplication();
      // service = app.get<CompanyService>(CompanyService);

      await app.init();
      server = app.getHttpServer();

      const datasource = app.get<DataSource>(getDataSourceToken());
      const seeds = new Seeds();
      await seeds.up(datasource.createQueryRunner());
    });

    beforeEach(() => {
      qb = CrudRequestQueryBuilder.create();
    });

    afterAll(async () => {
      await app.close();
    });

    describe('#getAll', () => {
      it('should return an array of all entities', (done) => {
        request(server)
          .get('/companies?include_deleted=1')
          .end((_, res) => {
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(10);
            done();
          });
      });
      it('should return an entities with limit', (done) => {
        const query = qb.setLimit(5).query();
        request(server)
          .get('/companies')
          .query(query)
          .end((_, res) => {
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(5);
            done();
          });
      });
      it('should return an entities with limit and page', (done) => {
        const query = qb
          .setLimit(3)
          .setPage(1)
          .sortBy({ field: 'id', order: 'DESC' })
          .query();
        request(server)
          .get('/companies')
          .query(query)
          .end((_, res) => {
            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(3);
            expect(res.body.count).toBe(3);
            expect(res.body.total).toBe(9);
            expect(res.body.page).toBe(1);
            expect(res.body.pageCount).toBe(3);
            done();
          });
      });
      it('should return an entities with offset', (done) => {
        const queryObj = qb.setOffset(3);
        if (isMysql) {
          queryObj.setLimit(10);
        }
        const query = queryObj.query();
        request(server)
          .get('/companies')
          .query(query)
          .end((_, res) => {
            expect(res.status).toBe(200);
            if (isMysql) {
              expect(res.body.count).toBe(6);
              expect(res.body.data.length).toBe(6);
            } else {
              expect(res.body.length).toBe(6);
            }
            done();
          });
      });
    });

    describe('#getOne', () => {
      it('should return status 404', (done) => {
        request(server)
          .get('/companies/333')
          .end((_, res) => {
            expect(res.status).toBe(404);
            done();
          });
      });
      it('should return status 404 for deleted entity', (done) => {
        request(server)
          .get('/companies/9')
          .end((_, res) => {
            expect(res.status).toBe(404);
            done();
          });
      });
      it('should return a deleted entity if include_deleted query param is specified', (done) => {
        request(server)
          .get('/companies/9?include_deleted=1')
          .end((_, res) => {
            expect(res.status).toBe(200);
            expect(res.body.id).toBe(9);
            done();
          });
      });
      it('should return an entity, 1', (done) => {
        request(server)
          .get('/companies/1')
          .end((_, res) => {
            expect(res.status).toBe(200);
            expect(res.body.id).toBe(1);
            done();
          });
      });
      it('should return an entity, 2', (done) => {
        const query = qb.select(['domain']).query();
        request(server)
          .get('/companies/1')
          .query(query)
          .end((_, res) => {
            expect(res.status).toBe(200);
            expect(res.body.id).toBe(1);
            expect(res.body.domain).toBeTruthy();
            done();
          });
      });
    });

    describe('#createOne', () => {
      it('should return status 400', (done) => {
        request(server)
          .post('/companies')
          .send('')
          .end((_, res) => {
            expect(res.status).toBe(400);
            done();
          });
      });
      it('should return saved entity', (done) => {
        const dto = {
          name: 'test0',
          domain: 'test0',
        };
        request(server)
          .post('/companies')
          .send(dto)
          .end((_, res) => {
            expect(res.status).toBe(201);
            expect(res.body.id).toBeTruthy();
            done();
          });
      });
      it('should return with `returnShallow`', (done) => {
        const dto = { description: 'returnShallow is true' };
        request(server)
          .post('/devices')
          .send(dto)
          .end((_, res) => {
            expect(res.status).toBe(201);
            expect(res.body.deviceKey).toBeTruthy();
            expect(res.body.description).toBeTruthy();
            done();
          });
      });
    });

    describe('#createMany', () => {
      it('should return status 400', (done) => {
        const dto = { bulk: [] };
        request(server)
          .post('/companies/bulk')
          .send(dto)
          .end((_, res) => {
            expect(res.status).toBe(400);
            done();
          });
      });
      it('should return created entities', (done) => {
        const dto = {
          bulk: [
            {
              name: 'test1',
              domain: 'test1',
            },
            {
              name: 'test2',
              domain: 'test2',
            },
          ],
        };
        request(server)
          .post('/companies/bulk')
          .send(dto)
          .end((_, res) => {
            expect(res.status).toBe(201);
            expect(res.body[0].id).toBeTruthy();
            expect(res.body[1].id).toBeTruthy();
            done();
          });
      });
    });

    describe('#updateOne', () => {
      it('should return status 404', (done) => {
        const dto = { name: 'updated0' };
        request(server)
          .patch('/companies/333')
          .send(dto)
          .end((_, res) => {
            expect(res.status).toBe(404);
            done();
          });
      });
      it('should return updated entity, 1', (done) => {
        const dto = { name: 'updated0' };
        request(server)
          .patch('/companies/1')
          .send(dto)
          .end((_, res) => {
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('updated0');
            done();
          });
      });
    });

    describe('#replaceOne', () => {
      it('should create entity', (done) => {
        const dto = { name: 'updated0', domain: 'domain0' };
        request(server)
          .put('/companies/333')
          .send(dto)
          .end((_, res) => {
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('updated0');
            done();
          });
      });
      it('should return updated entity, 1', (done) => {
        const dto = { name: 'updated0' };
        request(server)
          .put('/companies/1')
          .send(dto)
          .end((_, res) => {
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('updated0');
            done();
          });
      });
    });

    describe('#deleteOne', () => {
      it('should return status 404', (done) => {
        request(server)
          .delete('/companies/3333')
          .end((_, res) => {
            expect(res.status).toBe(404);
            done();
          });
      });
      it('should softly delete entity', (done) => {
        request(server)
          .delete('/companies/5')
          .end((_, res) => {
            expect(res.status).toBe(200);
            done();
          });
      });
      it('should not return softly deleted entity', (done) => {
        request(server)
          .get('/companies/5')
          .end((_, res) => {
            expect(res.status).toBe(404);
            done();
          });
      });
      it('should recover softly deleted entity', (done) => {
        request(server)
          .patch('/companies/5/recover')
          .end((_, res) => {
            expect(res.status).toBe(200);
            done();
          });
      });
      it('should return recovered entity', (done) => {
        request(server)
          .get('/companies/5')
          .end((_, res) => {
            expect(res.status).toBe(200);
            expect(res.body.id).toBe(5);
            done();
          });
      });
    });
  });
});
