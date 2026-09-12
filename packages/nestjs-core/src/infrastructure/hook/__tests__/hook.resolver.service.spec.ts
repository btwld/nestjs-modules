import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { type PlainLiteralObject } from '@nestjs/common';
import { type ModuleRef, type Reflector } from '@nestjs/core';

import { HookNotDecoratedException } from '../exceptions/hook-not-decorated.exception.js';
import { HookProviderNotFoundException } from '../exceptions/hook-provider-not-found.exception.js';
import { HookResolverService } from '../hook.resolver.service.js';
import { type HookWithSpec } from '../hook.types.js';

const TYPE_KEY = 'testHook';

class TestHook {}

function ctxWith(config: HookWithSpec): PlainLiteralObject {
  return { hooks: [config] };
}

describe(HookResolverService.name, () => {
  let moduleRef: DeepMockProxy<ModuleRef>;
  let reflector: DeepMockProxy<Reflector>;
  let service: HookResolverService;

  beforeEach(() => {
    moduleRef = mockDeep<ModuleRef>();
    reflector = mockDeep<Reflector>();
    service = new HookResolverService(moduleRef, reflector);
  });

  it('should throw HookProviderNotFoundException when the hook is not registered as a provider', async () => {
    moduleRef.get.mockImplementation(() => {
      throw new Error('Nest could not find TestHook element');
    });

    await expect(
      service.execute(
        { KEY: TYPE_KEY },
        'beforeFind',
        {},
        ctxWith({ hook: TestHook, type: TYPE_KEY }),
      ),
    ).rejects.toThrow(HookProviderNotFoundException);
  });

  it('should throw HookNotDecoratedException when the hook is missing @Hook()', async () => {
    moduleRef.get.mockReturnValue(new TestHook());
    reflector.get.mockReturnValue(undefined);

    await expect(
      service.execute(
        { KEY: TYPE_KEY },
        'beforeFind',
        {},
        ctxWith({ hook: TestHook, type: TYPE_KEY }),
      ),
    ).rejects.toThrow(HookNotDecoratedException);
  });

  it('should return the payload unchanged when the hook has no methods for this key', async () => {
    moduleRef.get.mockReturnValue(new TestHook());
    reflector.get.mockReturnValue(new Map());

    const payload = { value: 1 };

    const result = await service.execute(
      { KEY: TYPE_KEY },
      'beforeFind',
      payload,
      ctxWith({ hook: TestHook, type: TYPE_KEY }),
    );

    expect(result).toBe(payload);
  });
});
