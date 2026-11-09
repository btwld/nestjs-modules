import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { type PlainLiteralObject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { Hook, type HookWithSpec } from '@concepta/nestjs-core';

import {
  checkHooksUsable,
  type HookBootTargetInterface,
} from '../hook-boot-checks.js';
import { BeforeCreate, RepoHook } from '../repository-hook.decorators.js';

@RepoHook()
class GoodHook {
  @BeforeCreate()
  async stamp(data: PlainLiteralObject): Promise<PlainLiteralObject> {
    return data;
  }
}

/** No class-level decorator, so nothing gives it a subsystem type. */
class UndecoratedHook {
  @BeforeCreate()
  async stamp(data: PlainLiteralObject): Promise<PlainLiteralObject> {
    return data;
  }
}

@Hook({ type: 'someOtherSubsystem' })
class ForeignHook {
  @BeforeCreate()
  async stamp(data: PlainLiteralObject): Promise<PlainLiteralObject> {
    return data;
  }
}

/**
 * A full adapter would drag a driver and a metadata fixture into a test about
 * startup validation.
 */
const adapterStub = (over: {
  entityKey?: string;
  boundHooks?: HookWithSpec[];
}): HookBootTargetInterface => ({
  entityKey: over.entityKey ?? 'rows',
  boundHooks: over.boundHooks ?? [],
});

describe('hook boot checks', () => {
  describe(checkHooksUsable.name, () => {
    let moduleRef: DeepMockProxy<ModuleRef>;

    beforeEach(() => {
      moduleRef = mockDeep<ModuleRef>();
      moduleRef.get.mockReturnValue(new GoodHook());
    });

    it('passes a decorated, resolvable repository hook', () => {
      expect(
        checkHooksUsable(
          [
            adapterStub({
              boundHooks: [{ hook: GoodHook, type: RepoHook.KEY }],
            }),
          ],
          moduleRef,
        ),
      ).toEqual([]);
    });

    it('fails a hook with no class-level decorator', () => {
      const failures = checkHooksUsable(
        [adapterStub({ boundHooks: [{ hook: UndecoratedHook }] })],
        moduleRef,
      );

      expect(failures).toHaveLength(1);
      expect(failures[0]).toContain('UndecoratedHook');
      expect(failures[0]).toContain('@RepoHook()');
    });

    it('fails a hook decorated for another subsystem', () => {
      const failures = checkHooksUsable(
        [
          adapterStub({
            boundHooks: [{ hook: ForeignHook, type: 'someOtherSubsystem' }],
          }),
        ],
        moduleRef,
      );

      expect(failures).toHaveLength(1);
      expect(failures[0]).toContain('someOtherSubsystem');
    });

    it('fails a hook the container cannot resolve', () => {
      moduleRef.get.mockImplementation(() => {
        throw new Error('Nest could not find GoodHook element');
      });

      const failures = checkHooksUsable(
        [adapterStub({ boundHooks: [{ hook: GoodHook, type: RepoHook.KEY }] })],
        moduleRef,
      );

      expect(failures).toHaveLength(1);
      expect(failures[0]).toContain("module's providers");
    });
  });
});
