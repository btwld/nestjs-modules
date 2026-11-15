import { Observable, map, of } from 'rxjs';
import supertest from 'supertest';

import {
  Body,
  type CallHandler,
  type CanActivate,
  Controller,
  type ExecutionContext,
  Delete,
  Get,
  type INestApplication,
  Injectable,
  InternalServerErrorException,
  Module,
  type NestInterceptor,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, BaseExceptionFilter } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import {
  ActorCtx,
  type AppContextHost,
  Ctx,
  requireAppContext,
} from '@concepta/nestjs-core';

import { AccessControlModule } from '../../../access-control.module.js';
import { AccessRefusedException } from '../../../domain/exceptions/access-refused.exception.js';
import { AccessRulesInvalidException } from '../../../domain/exceptions/access-rules-invalid.exception.js';
import { type AccessControlContextInterface } from '../../../domain/interfaces/access-control-context.interface.js';
import { type AccessGrantsProviderInterface } from '../../../domain/interfaces/access-grants-provider.interface.js';
import { type AccessGrants } from '../../../domain/interfaces/access-grants.type.js';
import { type CanAccess } from '../../../domain/interfaces/can-access.interface.js';
import { AccessControlService } from '../../../domain/services/access-control.service.js';
import { accessFieldPaths } from '../../../domain/utils/access-field-paths.util.js';
import { AccessControlDeleteOne } from '../../decorators/access-control-delete-one.decorator.js';
import { AccessControlGrant } from '../../decorators/access-control-grant.decorator.js';
import { AccessControlQuery } from '../../decorators/access-control-query.decorator.js';
import { AccessControlReadMany } from '../../decorators/access-control-read-many.decorator.js';
import { AccessControlReadOne } from '../../decorators/access-control-read-one.decorator.js';
import { AccessControlUpdateOne } from '../../decorators/access-control-update-one.decorator.js';

import { headerActorResolverFixture } from './fixtures/header-actor.resolver.fixture.js';

const USER_1 = {
  firstName: 'John',
  lastName: 'Doe',
  phone: '(407) 123 1234',
  dob: '12/01/1988',
};
const USER_2 = { ...USER_1, firstName: 'Jane' };

const pick = (
  user: typeof USER_1,
  ...keys: (keyof typeof USER_1)[]
): Partial<typeof USER_1> =>
  Object.fromEntries(keys.map((key) => [key, user[key]]));

const seen: AccessControlContextInterface[] = [];

@Injectable()
class OwnerQueryFixture implements CanAccess {
  async canAccess(context: AccessControlContextInterface): Promise<boolean> {
    seen.push(context);
    const actor = context.getActor();
    return actor.kind === 'role' && actor.userId === 'owner';
  }
}

/**
 * Stands in for CRUD's response serializer: refuses a response missing any
 * field, as a schema with required fields would. Passes only when it sees
 * the response before the access filter does.
 */
@Injectable()
class RequireAllFieldsSerializerFixture implements NestInterceptor {
  intercept(_context: unknown, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (
          typeof data !== 'object' ||
          data === null ||
          !Object.keys(USER_1).every((key) => key in data)
        ) {
          throw new InternalServerErrorException(
            'serializer saw filtered data',
          );
        }
        return data;
      }),
    );
  }
}

@Controller('users')
class UserControllerFixture {
  constructor(private readonly accessControl: AccessControlService) {}

  @Get('open')
  open() {
    return USER_1;
  }

  @Get('rules')
  rules(@Ctx() ctx: AppContextHost) {
    return this.accessControl.effectiveRules(ctx);
  }

  @Get('page')
  @AccessControlReadMany('user-list')
  page() {
    return {
      data: [USER_1, USER_2],
      limit: 10,
      count: 2,
      total: 2,
      page: 1,
      pageCount: 1,
    };
  }

  @Get('nested')
  @AccessControlReadOne('user-list')
  nested() {
    return {
      firstName: 'John',
      address: { city: 'Springfield', street: 'Elm' },
    };
  }

  @Get()
  @AccessControlReadMany('user-list')
  list() {
    return [USER_1, USER_2];
  }

  @Get(':id/owned')
  @AccessControlReadOne('user')
  @AccessControlQuery({ service: OwnerQueryFixture })
  owned() {
    return USER_1;
  }

  @Get(':id')
  @AccessControlReadOne('user')
  one() {
    return USER_1;
  }

  @Patch(':id')
  @AccessControlUpdateOne('user')
  async update(
    @Ctx() ctx: AppContextHost,
    @Body() changes: Partial<typeof USER_1>,
  ) {
    await this.accessControl.assertFields(ctx, accessFieldPaths(changes));
    return { ...USER_1, ...changes };
  }

  @Delete(':id')
  @AccessControlDeleteOne('user')
  remove() {
    return { removed: true };
  }

  @Post('approve')
  @AccessControlGrant({ resource: 'contract', action: 'approve' })
  approve() {
    return { approved: true };
  }
}

@Controller('serialized')
@UseInterceptors(RequireAllFieldsSerializerFixture)
class SerializedControllerFixture {
  @Get()
  @AccessControlReadOne('user')
  one() {
    return USER_1;
  }
}

/**
 * Answers without calling the route, as a cache hit does.
 */
@Injectable()
class ShortCircuitInterceptorFixture implements NestInterceptor {
  intercept(): Observable<unknown> {
    return of(USER_1);
  }
}

@Controller('cached')
class CachedControllerFixture {
  @Get()
  @AccessControlReadOne('user')
  @UseInterceptors(ShortCircuitInterceptorFixture)
  one() {
    return USER_2;
  }
}

@Controller('whole')
@AccessControlReadOne('user')
class WholeControllerFixture {
  @Get()
  one() {
    return USER_1;
  }

  @Get('actor')
  actor(@Ctx() ctx: AppContextHost) {
    return ctx.with(ActorCtx);
  }

  @Get('profile')
  @AccessControlReadOne('profile')
  profile() {
    return USER_1;
  }
}

class UserDtoFixture {
  constructor(
    public firstName = 'John',
    public password = 'hunter2',
  ) {}
}

/**
 * Stands in for a global class serializer, such as Nest's
 * `ClassSerializerInterceptor` with an `@Exclude()` on `password`: it only
 * recognises the class's instances.
 */
@Injectable()
class ExcludePasswordSerializerFixture implements NestInterceptor {
  intercept(_context: unknown, next: CallHandler): Observable<unknown> {
    return next
      .handle()
      .pipe(
        map((data: unknown) =>
          data instanceof UserDtoFixture ? { firstName: data.firstName } : data,
        ),
      );
  }
}

@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ExcludePasswordSerializerFixture },
  ],
})
class GlobalSerializerModuleFixture {}

@Controller('dto')
class DtoControllerFixture {
  @Get()
  @AccessControlReadOne('user')
  one() {
    return new UserDtoFixture();
  }
}

/**
 * Defines the actor before any route guard, as a trusted gateway or
 * middleware would: `x-billing` makes the billing system the actor.
 */
@Injectable()
class BillingSystemGuardFixture implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { headers } = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
    }>();

    if (headers['x-billing']) {
      requireAppContext(context).defineOverlay(
        ActorCtx,
        { kind: 'system', name: 'billing' },
        { immutable: true },
      );
    }

    return true;
  }
}

@Module({
  providers: [{ provide: APP_GUARD, useClass: BillingSystemGuardFixture }],
})
class BillingSystemModuleFixture {}

/** Signs the caller in from `x-user`, as an authentication guard would. */
@Injectable()
class SignInGuardFixture implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: { id: string };
    }>();
    const id = request.headers['x-user'];
    if (id) request.user = { id };
    return true;
  }
}

/** Where authentication runs, relative to access control's guard. */
@Controller('order')
class GuardOrderControllerFixture {
  @Get('below')
  @AccessControlReadMany('user-list')
  @UseGuards(SignInGuardFixture)
  below() {
    return [];
  }

  @Get('above')
  @UseGuards(SignInGuardFixture)
  @AccessControlReadMany('user-list')
  above() {
    return [];
  }
}

@Controller('order/controller')
@UseGuards(SignInGuardFixture)
class ControllerGuardOrderFixture {
  @Get()
  @AccessControlReadMany('user-list')
  list() {
    return [];
  }
}

describe('AccessControl guard order (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AccessControlModule.forRoot({
          settings: {
            grants: {
              'role:clerk': [{ action: 'read', subject: 'user-list' }],
            },
          },
          // Reads the signed-in user from the request, as most resolvers do.
          actorResolver: {
            actorFor: async (_ctx, context) => {
              const user = context
                ?.switchToHttp()
                .getRequest<{ user?: { id: string } }>().user;
              return user
                ? { kind: 'role', roles: ['clerk'], userId: user.id }
                : undefined;
            },
          },
        }),
      ],
      controllers: [GuardOrderControllerFixture, ControllerGuardOrderFixture],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should see the user when authentication is below the access decorator', async () => {
    await supertest(app.getHttpServer())
      .get('/order/below')
      .set('x-user', 'u-1')
      .expect(200);
  });

  it('should see the user when authentication is on the controller', async () => {
    await supertest(app.getHttpServer())
      .get('/order/controller')
      .set('x-user', 'u-1')
      .expect(200);
  });

  it('should refuse everyone with no-actor when authentication is above it', async () => {
    const rendered = vi.spyOn(BaseExceptionFilter.prototype, 'catch');

    await supertest(app.getHttpServer())
      .get('/order/above')
      .set('x-user', 'u-1')
      .expect(403);

    const [exception] = rendered.mock.calls.at(-1) ?? [];
    expect(exception).toBeInstanceOf(AccessRefusedException);
    expect(exception).toMatchObject({ context: { refusal: 'no-actor' } });
    rendered.mockRestore();
  });
});

describe('AccessControl (e2e)', () => {
  let app: INestApplication;

  const createApp = async (options: {
    grants?: AccessGrants;
    grantsProvider?: AccessGrantsProviderInterface;
    serializer?: 'before' | 'after';
  }) => {
    const accessControl = AccessControlModule.forRoot({
      settings: { grants: options.grants },
      actorResolver: headerActorResolverFixture,
      grantsProvider: options.grantsProvider,
      queryServices: [OwnerQueryFixture],
    });

    const moduleRef = await Test.createTestingModule({
      imports: [
        BillingSystemModuleFixture,
        ...(options.serializer === 'before'
          ? [GlobalSerializerModuleFixture, accessControl]
          : options.serializer === 'after'
            ? [accessControl, GlobalSerializerModuleFixture]
            : [accessControl]),
      ],
      controllers: [
        UserControllerFixture,
        SerializedControllerFixture,
        CachedControllerFixture,
        WholeControllerFixture,
        DtoControllerFixture,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    return supertest(app.getHttpServer());
  };

  afterEach(async () => {
    seen.length = 0;
    await app?.close();
  });

  describe('checking', () => {
    it('refuses a checked route when nobody is acting', async () => {
      const api = await createApp({
        grants: { 'role:clerk': [{ action: 'read', subject: 'user' }] },
      });

      const response = await api.get('/users/1').expect(403);

      expect(response.body).toEqual(
        expect.objectContaining({ errorCode: 'ACCESS_REFUSED_ERROR' }),
      );
    });

    it('refuses a route the actor holds no grant for', async () => {
      const api = await createApp({
        grants: { 'role:clerk': [{ action: 'read', subject: 'user' }] },
      });

      await api.get('/users').set('x-roles', 'clerk').expect(403);
    });

    it('lets any route through that declares no grant', async () => {
      const api = await createApp({});

      await api.get('/users/open').expect(200).expect(USER_1);
    });

    it('lets a deny on one role win over another role allowing it', async () => {
      const api = await createApp({
        grants: {
          'role:a': [{ action: 'delete', subject: 'user', inverted: true }],
          'role:b': [{ action: 'delete', subject: 'user' }],
        },
      });

      await api.delete('/users/1').set('x-roles', 'b').expect(200);
      await api.delete('/users/1').set('x-roles', 'a,b').expect(403);
    });

    it('checks an action of your own, and a system as itself', async () => {
      const api = await createApp({
        grants: {
          'system:agile': [{ action: 'approve', subject: 'contract' }],
          'role:agile': [{ action: 'read', subject: 'user' }],
        },
      });

      await api.post('/users/approve').set('x-system', 'agile').expect(201);
      await api.post('/users/approve').set('x-roles', 'agile').expect(403);
    });

    it('lets an access query service decide, handing it the permitted grant', async () => {
      const api = await createApp({
        grants: { 'role:clerk': [{ action: 'read', subject: 'user' }] },
      });

      await api
        .get('/users/1/owned')
        .set('x-roles', 'clerk')
        .set('x-user', 'owner')
        .expect(200);
      await api
        .get('/users/1/owned')
        .set('x-roles', 'clerk')
        .set('x-user', 'someone-else')
        .expect(403);

      expect(seen[0]?.getQuery()).toEqual({
        actor: { kind: 'role', roles: ['clerk'], userId: 'owner' },
        action: 'read',
        resource: 'user',
      });
    });

    it('asks the grants provider on every call', async () => {
      const api = await createApp({
        grantsProvider: {
          rulesFor: async (_ctx, actor) =>
            actor.kind === 'role' && actor.userId === 'u1'
              ? [{ action: 'read', subject: 'user' }]
              : [],
        },
      });

      await api
        .get('/users/1')
        .set('x-roles', '')
        .set('x-user', 'u1')
        .expect(200);
      await api
        .get('/users/1')
        .set('x-roles', '')
        .set('x-user', 'u2')
        .expect(403);
    });

    it('fails startup on grants that cannot be used', async () => {
      await expect(
        createApp({
          grants: {
            'role:clerk': [{ action: 'read', subject: 'user', fields: [] }],
          },
        }),
      ).rejects.toThrow(AccessRulesInvalidException);
    });
  });

  describe('as a route guard', () => {
    it('uses an actor already on the context instead of the resolver', async () => {
      const api = await createApp({
        grants: {
          'system:billing': [{ action: 'read', subject: 'user' }],
          'role:clerk': [],
        },
      });

      await api.get('/whole').set('x-billing', '1').expect(200);
      await api
        .get('/whole/actor')
        .set('x-billing', '1')
        .set('x-roles', 'clerk')
        .expect(200)
        .expect({ kind: 'system', name: 'billing' });
    });

    it('fails a checked route when the grants provider returns unusable rules', async () => {
      const api = await createApp({
        grantsProvider: {
          rulesFor: async () => [{ action: 'manage', subject: 'all' }],
        },
      });

      const response = await api
        .get('/whole')
        .set('x-roles', 'clerk')
        .expect(500);

      expect(response.body).toEqual(
        expect.objectContaining({ errorCode: 'ACCESS_RULES_INVALID_ERROR' }),
      );
    });

    it('checks before a route interceptor that answers without the route', async () => {
      const api = await createApp({
        grants: {
          'role:clerk': [
            { action: 'read', subject: 'user' },
            {
              action: 'read',
              subject: 'user',
              fields: ['phone'],
              inverted: true,
            },
          ],
        },
      });

      await api.get('/cached').expect(403);
      await api
        .get('/cached')
        .set('x-roles', 'clerk')
        .expect(200)
        .expect(pick(USER_1, 'firstName', 'lastName', 'dob'));
    });

    it('checks every route of a controller declaring the grant', async () => {
      const api = await createApp({
        grants: { 'role:clerk': [{ action: 'read', subject: 'user' }] },
      });

      await api.get('/whole').expect(403);
      await api.get('/whole').set('x-roles', 'staff').expect(403);
      await api.get('/whole').set('x-roles', 'clerk').expect(200);
    });

    it('lets a route grant override its controller grant, checking the call once', async () => {
      const rulesFor = vi
        .fn<AccessGrantsProviderInterface['rulesFor']>()
        .mockResolvedValue([{ action: 'read', subject: 'profile' }]);
      const api = await createApp({ grantsProvider: { rulesFor } });

      await api
        .get('/whole/profile')
        .set('x-roles', 'staff')
        .expect(200)
        .expect(USER_1);
      expect(rulesFor).toHaveBeenCalledTimes(1);
    });

    it('defines the actor on the context for the handler', async () => {
      const api = await createApp({
        grants: { 'role:clerk': [{ action: 'read', subject: 'user' }] },
      });

      await api
        .get('/whole/actor')
        .set('x-roles', 'clerk')
        .set('x-user', 'u1')
        .expect(200)
        .expect({ kind: 'role', roles: ['clerk'], userId: 'u1' });
    });
  });

  describe('filtering', () => {
    it.each(['before', 'after'] as const)(
      'leaves a global class serializer able to recognise the instance, registered %s',
      async (serializer) => {
        const api = await createApp({
          grants: { 'role:clerk': [{ action: 'read', subject: 'user' }] },
          serializer,
        });

        await api
          .get('/dto')
          .set('x-roles', 'clerk')
          .expect(200)
          .expect({ firstName: 'John' });
      },
    );

    it('removes a nested field the caller may not read, keeping its parent', async () => {
      const api = await createApp({
        grants: {
          'role:clerk': [
            { action: 'read', subject: 'user-list' },
            {
              action: 'read',
              subject: 'user-list',
              fields: ['address.street'],
              inverted: true,
            },
          ],
        },
      });

      await api
        .get('/users/nested')
        .set('x-roles', 'clerk')
        .expect(200)
        .expect({ firstName: 'John', address: { city: 'Springfield' } });
    });

    it('combines fields across roles, for each item of an array', async () => {
      const api = await createApp({
        grants: {
          'role:role2': [
            { action: 'read', subject: 'user-list', fields: ['phone'] },
          ],
          'role:role1': [
            {
              action: 'read',
              subject: 'user-list',
              fields: ['firstName', 'lastName'],
            },
          ],
        },
      });

      await api
        .get('/users')
        .set('x-roles', 'role1,role2')
        .expect(200)
        .expect([
          pick(USER_1, 'firstName', 'lastName', 'phone'),
          pick(USER_2, 'firstName', 'lastName', 'phone'),
        ]);
    });

    it('filters the items of a page, keeping the page itself', async () => {
      const api = await createApp({
        grants: {
          'role:clerk': [
            { action: 'read', subject: 'user-list', fields: ['firstName'] },
          ],
        },
      });

      await api
        .get('/users/page')
        .set('x-roles', 'clerk')
        .expect(200)
        .expect({
          data: [pick(USER_1, 'firstName'), pick(USER_2, 'firstName')],
          limit: 10,
          count: 2,
          total: 2,
          page: 1,
          pageCount: 1,
        });
    });

    it('hides a denied field inside every item of a page', async () => {
      const api = await createApp({
        grants: {
          'role:clerk': [
            { action: 'read', subject: 'user-list' },
            {
              action: 'read',
              subject: 'user-list',
              fields: ['phone'],
              inverted: true,
            },
          ],
        },
      });

      const response = await api
        .get('/users/page')
        .set('x-roles', 'clerk')
        .expect(200);

      expect(response.body.data).toEqual([
        pick(USER_1, 'firstName', 'lastName', 'dob'),
        pick(USER_2, 'firstName', 'lastName', 'dob'),
      ]);
    });

    it('returns every field for a grant without fields', async () => {
      const api = await createApp({
        grants: { 'role:manager': [{ action: 'read', subject: 'user' }] },
      });

      await api
        .get('/users/1')
        .set('x-roles', 'manager')
        .expect(200)
        .expect(USER_1);
    });

    it('filters after the route serializer has seen the full response', async () => {
      const api = await createApp({
        grants: {
          'role:clerk': [
            { action: 'read', subject: 'user', fields: ['firstName'] },
          ],
        },
      });

      await api
        .get('/serialized')
        .set('x-roles', 'clerk')
        .expect(200)
        .expect(pick(USER_1, 'firstName'));
    });

    it('leaves a route that declares no grant unfiltered', async () => {
      const api = await createApp({
        grants: {
          'role:clerk': [
            { action: 'read', subject: 'user', fields: ['firstName'] },
          ],
        },
      });

      await api
        .get('/users/open')
        .set('x-roles', 'clerk')
        .expect(200)
        .expect(USER_1);
    });
  });

  describe('filtering a write response', () => {
    const grants: AccessGrants = {
      'role:editor': [
        { action: ['update', 'read'], subject: 'user' },
        {
          action: 'read',
          subject: 'user',
          fields: ['dob'],
          inverted: true,
        },
      ],
      'role:writer': [
        { action: 'update', subject: 'user' },
        {
          action: 'update',
          subject: 'user',
          fields: ['dob'],
          inverted: true,
        },
      ],
    };

    it('shows what the caller may read, not what they may write', async () => {
      const api = await createApp({ grants });

      await api
        .patch('/users/1')
        .set('x-roles', 'editor')
        .send({ firstName: 'Jo' })
        .expect(200)
        .expect({ ...pick(USER_1, 'lastName', 'phone'), firstName: 'Jo' });
    });

    it('shows nothing to a caller who may write but not read', async () => {
      const api = await createApp({ grants });

      await api
        .patch('/users/1')
        .set('x-roles', 'writer')
        .send({ firstName: 'Jo' })
        .expect(200)
        .expect({});
    });
  });

  describe('field checks in a handler', () => {
    const grants: AccessGrants = {
      'role:member': [
        { action: 'update', subject: 'user' },
        {
          action: 'update',
          subject: 'user',
          fields: ['phone'],
          inverted: true,
        },
      ],
      'role:admin': [{ action: 'update', subject: 'user' }],
    };

    it('checks the fields a handler names under the grant the route let the caller in on', async () => {
      const api = await createApp({ grants });

      await api
        .patch('/users/1')
        .set('x-roles', 'member')
        .send({ firstName: 'Jo' })
        .expect(200);

      // The response names no refusal: the exception it was rendered from
      // does, in its context.
      const rendered = vi.spyOn(BaseExceptionFilter.prototype, 'catch');
      const response = await api
        .patch('/users/1')
        .set('x-roles', 'member')
        .send({ phone: '555' })
        .expect(403);
      const [exception] = rendered.mock.calls.at(-1) ?? [];
      rendered.mockRestore();

      expect(response.body).toEqual(
        expect.objectContaining({
          message: 'Not allowed to update user',
        }),
      );
      expect(
        exception instanceof AccessRefusedException && {
          refusal: exception.context.refusal,
          fields: exception.context.fields,
        },
      ).toEqual({ refusal: 'field', fields: ['phone'] });

      await api
        .patch('/users/1')
        .set('x-roles', 'admin')
        .send({ phone: '555' })
        .expect(200);
    });
  });

  describe('effective rules', () => {
    it('returns the actor rules, denies last, on a route without a grant', async () => {
      const api = await createApp({
        grants: {
          'role:a': [{ action: 'void', subject: 'invoice', inverted: true }],
          'role:b': [{ action: 'read', subject: 'invoice' }],
        },
      });

      await api
        .get('/users/rules')
        .set('x-roles', 'a,b')
        .expect(200)
        .expect([
          { action: 'read', subject: 'invoice' },
          { action: 'void', subject: 'invoice', inverted: true },
        ]);
    });
  });
});
