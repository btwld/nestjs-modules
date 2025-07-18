import 'jest-extended';
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
import { CompanyDto } from '../../__fixtures__/typeorm/company/dto/company.dto';
import { NoteDto } from '../../__fixtures__/typeorm/note/dto/note.dto';
import { NoteCrudService } from '../../__fixtures__/typeorm/note/note-crud.service';
import { NoteTypeOrmCrudAdapter } from '../../__fixtures__/typeorm/note/note-typeorm-crud.adapter';
import { NoteEntity } from '../../__fixtures__/typeorm/note/note.entity';
import { ormSqliteConfig } from '../../__fixtures__/typeorm/orm.sqlite.config';
import { ProjectCreateDto } from '../../__fixtures__/typeorm/project/dto/project-create.dto';
import { ProjectDto } from '../../__fixtures__/typeorm/project/dto/project.dto';
import { ProjectCrudService } from '../../__fixtures__/typeorm/project/project-crud.service';
import { ProjectTypeOrmCrudAdapter } from '../../__fixtures__/typeorm/project/project-typeorm-crud.adapter';
import { ProjectEntity } from '../../__fixtures__/typeorm/project/project.entity';
import { Seeds } from '../../__fixtures__/typeorm/seeds';
import { UserDto } from '../../__fixtures__/typeorm/users/dto/user.dto';
import { UserCrudService } from '../../__fixtures__/typeorm/users/user-crud.service';
import { UserTypeOrmCrudAdapter } from '../../__fixtures__/typeorm/users/user-typeorm-crud.adapter';
import { UserEntity } from '../../__fixtures__/typeorm/users/user.entity';
import { CrudGetMany } from '../../crud/decorators/actions/crud-get-many.decorator';
import { CrudGetOne } from '../../crud/decorators/actions/crud-get-one.decorator';
import { CrudUpdateOne } from '../../crud/decorators/actions/crud-update-one.decorator';
import { CrudController } from '../../crud/decorators/controller/crud-controller.decorator';
import { CrudBody } from '../../crud/decorators/params/crud-body.decorator';
import { CrudRequest } from '../../crud/decorators/params/crud-request.decorator';
import { CrudAllow } from '../../crud/decorators/routes/crud-allow.decorator';
import { CrudExclude } from '../../crud/decorators/routes/crud-exclude.decorator';
import { CrudFilter } from '../../crud/decorators/routes/crud-filter.decorator';
import { CrudLimit } from '../../crud/decorators/routes/crud-limit.decorator';
import { CrudMaxLimit } from '../../crud/decorators/routes/crud-max-limit.decorator';
import { CrudSort } from '../../crud/decorators/routes/crud-sort.decorator';
import { CrudRequestInterface } from '../../crud/interfaces/crud-request.interface';
import { CrudModule } from '../../crud.module';
import { CrudRequestQueryBuilder } from '../../request/crud-request-query.builder';

// tslint:disable:max-classes-per-file
describe('#crud-typeorm', () => {
  describe('#query params', () => {
    let app: INestApplication;
    let server: ReturnType<INestApplication['getHttpServer']>;
    let qb: CrudRequestQueryBuilder;

    @CrudController({
      path: 'companies',
      model: { type: CompanyDto },
    })
    @CrudExclude(['updatedAt'])
    @CrudFilter({ id: { $ne: 1 } })
    @CrudAllow(['id', 'name', 'domain', 'description'])
    @CrudMaxLimit(5)
    class CompaniesController {
      constructor(public service: CompanyCrudService) {}

      @CrudGetMany()
      getMany(@CrudRequest() request: CrudRequestInterface) {
        return this.service.getMany(request);
      }
    }

    @CrudController({
      path: 'projects',
      model: { type: ProjectDto },
      params: {
        id: {
          field: 'id',
          type: 'number',
          primary: true,
        },
      },
    })
    @CrudSort([{ field: 'id', order: 'ASC' }])
    @CrudLimit(100)
    class ProjectsController {
      constructor(public service: ProjectCrudService) {}

      @CrudGetMany()
      getMany(@CrudRequest() request: CrudRequestInterface) {
        return this.service.getMany(request);
      }

      @CrudGetOne()
      getOne(@CrudRequest() request: CrudRequestInterface) {
        return this.service.getOne(request);
      }

      @CrudUpdateOne()
      updateOne(
        @CrudRequest() request: CrudRequestInterface,
        @CrudBody() project: ProjectCreateDto,
      ) {
        return this.service.updateOne(request, project);
      }
    }

    @CrudController({
      path: 'projects2',
      model: { type: ProjectDto },
    })
    class ProjectsController2 {
      constructor(public service: ProjectCrudService) {}

      @CrudGetMany()
      getMany(@CrudRequest() request: CrudRequestInterface) {
        return this.service.getMany(request);
      }
    }

    @CrudController({
      path: 'projects3',
      model: { type: ProjectDto },
    })
    @CrudFilter({ isActive: false })
    class ProjectsController3 {
      constructor(public service: ProjectCrudService) {}

      @CrudGetMany()
      getMany(@CrudRequest() request: CrudRequestInterface) {
        return this.service.getMany(request);
      }
    }

    @CrudController({
      path: 'projects4',
      model: { type: ProjectDto },
    })
    @CrudFilter({ isActive: true })
    class ProjectsController4 {
      constructor(public service: ProjectCrudService) {}

      @CrudGetMany()
      getMany(@CrudRequest() request: CrudRequestInterface) {
        return this.service.getMany(request);
      }
    }

    @CrudController({
      path: 'users',
      model: { type: UserDto },
    })
    class UsersController {
      constructor(public service: UserCrudService) {}

      @CrudGetMany()
      getMany(@CrudRequest() request: CrudRequestInterface) {
        return this.service.getMany(request);
      }
    }

    @CrudController({
      path: 'notes',
      model: { type: NoteDto },
    })
    class NotesController {
      constructor(public service: NoteCrudService) {}

      @CrudGetMany()
      getMany(@CrudRequest() request: CrudRequestInterface) {
        return this.service.getMany(request);
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
            NoteEntity,
          ]),
          CrudModule.forRoot({}),
        ],
        controllers: [
          CompaniesController,
          ProjectsController,
          ProjectsController2,
          ProjectsController3,
          ProjectsController4,
          UsersController,
          NotesController,
        ],
        providers: [
          { provide: APP_FILTER, useClass: ExceptionsFilter },
          CompanyTypeOrmCrudAdapter,
          CompanyCrudService,
          UserTypeOrmCrudAdapter,
          UserCrudService,
          ProjectTypeOrmCrudAdapter,
          ProjectCrudService,
          NoteTypeOrmCrudAdapter,
          NoteCrudService,
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

    describe('#select', () => {
      it('should throw status 400', (done) => {
        const query = qb
          .setFilter({ field: 'invalid', operator: 'isnull' })
          .query();
        request(server)
          .get('/companies')
          .query(query)
          .end((_, res) => {
            expect(res.status).toBe(500);
            done();
          });
      });
    });

    describe('#query filter', () => {
      it('should return data with limit', (done) => {
        const query = qb.setLimit(4).query();
        request(server)
          .get('/companies')
          .query(query)
          .end((_, res) => {
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(4);
            res.body.forEach((e: CompanyEntity) => {
              expect(e.id).not.toBe(1);
            });
            done();
          });
      });
      it('should return with maxLimit', (done) => {
        const query = qb.setLimit(7).query();
        request(server)
          .get('/companies')
          .query(query)
          .end((_, res) => {
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(5);
            done();
          });
      });
      it('should return with filter and or, 1', (done) => {
        const query = qb
          .setFilter({
            field: 'name',
            operator: 'notin',
            value: ['Name2', 'Name3'],
          })
          .setOr({ field: 'domain', operator: 'cont', value: 5 })
          .query();
        request(server)
          .get('/companies')
          .query(query)
          .end((_, res) => {
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(5);
            done();
          });
      });
      it('should return with filter and or, 2', (done) => {
        const query = qb
          .setFilter({ field: 'name', operator: 'ends', value: 'foo' })
          .setOr({ field: 'name', operator: 'starts', value: 'P' })
          .setOr({ field: 'isActive', operator: 'eq', value: true })
          .query();
        request(server)
          .get('/projects')
          .query(query)
          .end((_, res) => {
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(10);
            done();
          });
      });
      it('should return with filter and or, 3', (done) => {
        const query = qb
          .setOr({ field: 'companyId', operator: 'gt', value: 22 })
          .setFilter({ field: 'companyId', operator: 'gte', value: 6 })
          .setFilter({ field: 'companyId', operator: 'lt', value: 10 })
          .query();
        request(server)
          .get('/projects')
          .query(query)
          .end((_, res) => {
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(8);
            done();
          });
      });
      it('should return with filter and or, 4', (done) => {
        const query = qb
          .setOr({ field: 'companyId', operator: 'in', value: [6, 10] })
          .setOr({ field: 'companyId', operator: 'lte', value: 10 })
          .setFilter({ field: 'isActive', operator: 'eq', value: false })
          .setFilter({ field: 'description', operator: 'notnull' })
          .query();
        request(server)
          .get('/projects')
          .query(query)
          .end((_, res) => {
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(10);
            done();
          });
      });
      it('should return with filter and or, 6', (done) => {
        const query = qb
          .setOr({ field: 'companyId', operator: 'isnull' })
          .query();
        request(server)
          .get('/projects')
          .query(query)
          .end((_, res) => {
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(0);
            done();
          });
      });
      it('should return with filter and or, 6', (done) => {
        const query = qb
          .setOr({ field: 'companyId', operator: 'between', value: [1, 5] })
          .query();
        request(server)
          .get('/projects')
          .query(query)
          .end((_, res) => {
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(10);
            done();
          });
      });
      it('should return with filter, 1', (done) => {
        const query = qb
          .setOr({ field: 'companyId', operator: 'eq', value: 1 })
          .query();
        request(server)
          .get('/projects')
          .query(query)
          .end((_, res) => {
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(2);
            done();
          });
      });
    });

    describe('#sort', () => {
      it('should sort by field', async () => {
        const query = qb.sortBy({ field: 'id', order: 'DESC' }).query();
        const res = await request(server)
          .get('/users')
          .query(query)
          .expect(200);
        expect(res.body[1].id).toBeLessThan(res.body[0].id);
      });

      it('should throw 400 if SQL injection has been detected', (done) => {
        const query = qb
          .sortBy({
            field: ' ASC; SELECT CAST( version() AS INTEGER); --',
            order: 'DESC',
          })
          .query();

        request(server)
          .get('/companies')
          .query(query)
          .end((_, res) => {
            expect(res.status).toBeGreaterThanOrEqual(400);
            done();
          });
      });
    });

    describe('#search', () => {
      const projects2 = () => request(server).get('/projects2');
      const projects3 = () => request(server).get('/projects3');
      const projects4 = () => request(server).get('/projects4');

      it('should return with search, 1', async () => {
        const query = qb.search({ id: 1 }).query();
        const res = await projects2().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(1);
        expect(res.body[0].id).toBe(1);
      });
      it('should return with search, 2', async () => {
        const query = qb.search({ id: 1, name: 'Project1' }).query();
        const res = await projects2().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(1);
        expect(res.body[0].id).toBe(1);
      });
      it('should return with search, 3', async () => {
        const query = qb.search({ id: 1, name: { $eq: 'Project1' } }).query();
        const res = await projects2().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(1);
        expect(res.body[0].id).toBe(1);
      });
      it('should return with search, 4', async () => {
        const query = qb.search({ name: { $eq: 'Project1' } }).query();
        const res = await projects2().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(1);
        expect(res.body[0].id).toBe(1);
      });
      it('should return with search, 5', async () => {
        const query = qb.search({ id: { $notnull: true, $eq: 1 } }).query();
        const res = await projects2().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(1);
        expect(res.body[0].id).toBe(1);
      });
      it('should return with search, 6', async () => {
        const query = qb
          .search({ id: { $or: { $isnull: true, $eq: 1 } } })
          .query();
        const res = await projects2().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(1);
        expect(res.body[0].id).toBe(1);
      });
      it('should return with search, 7', async () => {
        const query = qb.search({ id: { $or: { $eq: 1 } } }).query();
        const res = await projects2().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(1);
        expect(res.body[0].id).toBe(1);
      });
      it('should return with search, 8', async () => {
        const query = qb
          .search({ id: { $notnull: true, $or: { $eq: 1, $in: [30, 31] } } })
          .query();
        const res = await projects2().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(1);
        expect(res.body[0].id).toBe(1);
      });
      it('should return with search, 9', async () => {
        const query = qb
          .search({ id: { $notnull: true, $or: { $eq: 1 } } })
          .query();
        const res = await projects2().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(1);
        expect(res.body[0].id).toBe(1);
      });
      it('should return with search, 10', async () => {
        const query = qb.search({ id: null }).query();
        const res = await projects2().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(0);
      });
      it('should return with search, 11', async () => {
        const query = qb
          .search({
            $and: [{ id: { $notin: [5, 6, 7, 8, 9, 10] } }, { isActive: true }],
          })
          .query();
        const res = await projects2().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(4);
      });
      it('should return with search, 12', async () => {
        const query = qb
          .search({ $and: [{ id: { $notin: [5, 6, 7, 8, 9, 10] } }] })
          .query();
        const res = await projects2().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(14);
      });
      it('should return with search, 13', async () => {
        const query = qb.search({ $or: [{ id: 54 }] }).query();
        const res = await projects2().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(0);
      });
      it('should return with search, 14', async () => {
        const query = qb
          .search({ $or: [{ id: 54 }, { id: 33 }, { id: { $in: [1, 2] } }] })
          .query();
        const res = await projects2().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(2);
        expect(res.body[0].id).toBe(1);
        expect(res.body[1].id).toBe(2);
      });
      it('should return with search, 15', async () => {
        const query = qb
          .search({ $or: [{ id: 54 }], name: 'Project1' })
          .query();
        const res = await projects2().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(0);
      });
      it('should return with search, 16', async () => {
        const query = qb
          .search({ $or: [{ isActive: false }, { id: 3 }], name: 'Project3' })
          .query();
        const res = await projects2().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(1);
        expect(res.body[0].id).toBe(3);
      });
      it('should return with search, 17', async () => {
        const query = qb
          .search({
            $or: [{ isActive: false }, { id: { $eq: 3 } }],
            name: 'Project3',
          })
          .query();
        const res = await projects2().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(1);
        expect(res.body[0].id).toBe(3);
      });
      it('should return with search, 17', async () => {
        const query = qb
          .search({
            $or: [{ isActive: false }, { id: { $eq: 3 } }],
            name: { $eq: 'Project3' },
          })
          .query();
        const res = await projects2().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(1);
        expect(res.body[0].id).toBe(3);
      });
      it('should return with default filter, 1', async () => {
        const query = qb.search({ name: 'Project11' }).query();
        const res = await projects3().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(1);
        expect(res.body[0].id).toBe(11);
      });
      it('should return with default filter, 2', async () => {
        const query = qb.search({ name: 'Project1' }).query();
        const res = await projects3().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(0);
      });
      it('should return with default filter, 3', async () => {
        const query = qb.search({ name: 'Project2' }).query();
        const res = await projects4().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(1);
        expect(res.body[0].id).toBe(2);
      });
      it('should return with default filter, 4', async () => {
        const query = qb.search({ name: 'Project11' }).query();
        const res = await projects4().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(0);
      });
      it('should return with $eqL search operator', async () => {
        const query = qb.search({ name: { $eqL: 'project1' } }).query();
        const res = await projects4().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(1);
      });
      it('should return with $neL search operator', async () => {
        const query = qb.search({ name: { $neL: 'project1' } }).query();
        const res = await projects4().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(9);
      });
      it('should return with $startsL search operator', async () => {
        const query = qb.search({ email: { $startsL: '2' } }).query();
        const res = await request(server)
          .get('/users')
          .query(query)
          .expect(200);
        expect(res.body).toBeArrayOfSize(3);
      });
      it('should return with $endsL search operator', async () => {
        const query = qb.search({ domain: { $endsL: 'AiN10' } }).query();
        const res = await request(server)
          .get('/companies')
          .query(query)
          .expect(200);
        expect(res.body).toBeArrayOfSize(1);
        expect(res.body[0].domain).toBe('Domain10');
      });
      it('should return with $contL search operator', async () => {
        const query = qb.search({ email: { $contL: '1@' } }).query();
        const res = await request(server)
          .get('/users')
          .query(query)
          .expect(200);
        expect(res.body).toBeArrayOfSize(3);
      });
      it('should return with $exclL search operator', async () => {
        const query = qb.search({ email: { $exclL: '1@' } }).query();
        const res = await request(server)
          .get('/users')
          .query(query)
          .expect(200);
        expect(res.body).toBeArrayOfSize(18);
      });
      it('should return with $inL search operator', async () => {
        const query = qb.search({ name: { $inL: ['name2', 'name3'] } }).query();
        const res = await request(server)
          .get('/companies')
          .query(query)
          .expect(200);
        expect(res.body).toBeArrayOfSize(2);
      });
      it('should return with $notinL search operator', async () => {
        const query = qb
          .search({ name: { $notinL: ['project7', 'project8', 'project9'] } })
          .query();
        const res = await projects4().query(query).expect(200);
        expect(res.body).toBeArrayOfSize(7);
      });
      it('should search by display column name, but use dbName in sql query', async () => {
        const query = qb.search({ revisionId: 2 }).query();
        const res = await request(server)
          .get('/notes')
          .query(query)
          .expect(200);
        expect(res.body).toBeArrayOfSize(2);
        expect(res.body[0].revisionId).toBe(2);
        expect(res.body[1].revisionId).toBe(2);
      });
    });

    describe('#update', () => {
      it('should update company id of project', async () => {
        await request(server)
          .patch('/projects/18')
          .send({ companyId: 10 })
          .expect(200);

        const modified = await request(server).get('/projects/18').expect(200);

        expect(modified.body.companyId).toBe(10);
      });
    });
  });
});
