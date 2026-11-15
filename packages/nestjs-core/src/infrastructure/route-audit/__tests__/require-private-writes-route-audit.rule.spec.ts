import {
  All,
  Controller,
  Delete,
  Get,
  Head,
  Patch,
  Post,
  Put,
  RequestMapping,
  RequestMethod,
  type Type,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { CoreModule } from '../../../core.module.js';
import { PublicRoute } from '../decorators/public-route.decorator.js';
import { type RouteAuditSettingsInterface } from '../interfaces/route-audit-settings.interface.js';

@Controller('open')
@PublicRoute()
class OpenController {
  @Get()
  list(): void {}

  @Head()
  head(): void {}

  @Post()
  create(): void {}

  @Put(':id')
  replace(): void {}

  @Patch(':id')
  update(): void {}

  @Delete(':id')
  remove(): void {}

  @All('any')
  any(): void {}
}

@Controller('closed')
class ClosedController {
  @Post()
  create(): void {}
}

/** Starts and closes an application; a failed start rejects with its error. */
async function boot(
  routeAudit: RouteAuditSettingsInterface,
  controllers: Type[],
): Promise<void> {
  const moduleRef = await Test.createTestingModule({
    imports: [CoreModule.forRoot({ routeAudit })],
    controllers,
  }).compile();

  try {
    await moduleRef.init();
  } finally {
    await moduleRef.close();
  }
}

const message =
  'This public route takes writes, so anyone may call it. Sign its callers in, or allow the route under requirePrivateWrites if anyone may write through it, such as to sign in.';

describe('requirePrivateWrites', () => {
  it('refuses every public route that may write, ALL included', async () => {
    const failure = await boot({}, [OpenController]).catch(
      (error: unknown) => error,
    );

    expect(failure).toHaveProperty(
      'message',
      'The route audit found 5 violation(s):\n' +
        [
          'POST /open',
          'PUT /open/:id',
          'PATCH /open/:id',
          'DELETE /open/:id',
          'ALL /open/any',
        ]
          .map((id) => `  - [requirePrivateWrites] ${id}: ${message}`)
          .join('\n'),
    );
  });

  it('lets public reads and non-public writes through', async () => {
    @Controller('reads')
    @PublicRoute()
    class ReadsController {
      @Get()
      list(): void {}

      @Head()
      head(): void {}

      @RequestMapping({ path: 'options', method: RequestMethod.OPTIONS })
      options(): void {}

      @RequestMapping({ path: 'search', method: RequestMethod.SEARCH })
      search(): void {}

      @RequestMapping({ path: 'propfind', method: RequestMethod.PROPFIND })
      propfind(): void {}

      @RequestMapping({ path: 'query', method: RequestMethod.QUERY })
      query(): void {}
    }

    await expect(
      boot({}, [ReadsController, ClosedController]),
    ).resolves.toBeUndefined();
  });

  it('lets a public write listed in allow through', async () => {
    @Controller('auth')
    class SignInController {
      @Post('login')
      @PublicRoute()
      login(): void {}
    }

    await expect(
      boot({ allow: { requirePrivateWrites: ['POST /auth/login'] } }, [
        SignInController,
      ]),
    ).resolves.toBeUndefined();
  });
});
