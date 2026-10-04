import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { type PlainLiteralObject, type Type } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';

import {
  AppContextHost,
  type DeepPartial,
  HookResolverService,
  HooksCtx,
} from '@concepta/nestjs-core';

import { HookBootException } from '../../exceptions/hook-boot.exception.js';
import { type RepositoryMetadataInterface } from '../../repository/interfaces/repository-metadata.interface.js';
import { type RepositoryCreateOptions } from '../../repository/interfaces/repository-options.interface.js';
import { RepositoryAdapter } from '../../repository/repository-adapter.js';
import { BeforeCreate, RepoHook } from '../repository-hook.decorators.js';

interface Row extends PlainLiteralObject {
  id: string;
  owner: string | null;
  dateDeleted: Date | null;
}

class RowClass {
  declare id: string;
  declare owner: string | null;
  declare dateDeleted: Date | null;
}

/**
 * Stands in for the owner-stamp hook in the reported case: the thing whose
 * silent absence wrote a row with no isolation applied.
 */
@RepoHook()
class StampHook {
  @BeforeCreate()
  async stamp(data: DeepPartial<Row>): Promise<DeepPartial<Row>> {
    return { ...data, owner: 'stamped' };
  }
}

/**
 * Counts its own invocations. A write hook's output is merged with the caller
 * winning on conflict, so a second run is invisible in the payload — the count
 * is what makes "runs once" assertable.
 */
const secondHookCalls: string[] = [];

@RepoHook()
class SecondHook {
  @BeforeCreate()
  async tag(data: DeepPartial<Row>): Promise<DeepPartial<Row>> {
    secondHookCalls.push(String(data.id));
    return data;
  }
}

class StampAdapter extends RepositoryAdapter<Row> {
  readonly metadata: RepositoryMetadataInterface<Row> = {
    name: 'Row',
    type: RowClass as Type<Row>,
    columns: [
      { name: 'id', isPrimary: true, isRemoveDate: false, isVersion: false },
      {
        name: 'owner',
        isPrimary: false,
        isRemoveDate: false,
        isVersion: false,
      },
      {
        name: 'dateDeleted',
        isPrimary: false,
        isRemoveDate: true,
        isVersion: false,
      },
    ],
    relations: [],
  };

  readonly created: DeepPartial<Row>[] = [];

  protected async doCreate(entity: DeepPartial<Row>): Promise<Row> {
    this.created.push(entity);
    return this.transform({ id: 'row-1', owner: null, ...entity });
  }

  protected async doFind(): Promise<Row[]> {
    return [];
  }
  protected async doFindOne(): Promise<Row | null> {
    return null;
  }
  protected async doCount(): Promise<number> {
    return 0;
  }
  protected async doFindAndCount(): Promise<[Row[], number]> {
    return [[], 0];
  }
  protected async doCreateMany(
    entities: DeepPartial<Row>[],
    _options?: RepositoryCreateOptions,
  ): Promise<Row[]> {
    return entities.map((e) =>
      this.transform({ id: 'row-1', owner: null, ...e }),
    );
  }
  protected async doUpdate(entity: Row): Promise<Row> {
    return entity;
  }
  protected async doUpsert(entity: DeepPartial<Row>): Promise<Row> {
    return this.transform({ id: 'row-1', owner: null, ...entity });
  }
  protected async doReplace(entity: Row): Promise<Row> {
    return entity;
  }
  protected async doDelete(entity: Row): Promise<Row> {
    return entity;
  }
  protected async doDeleteMany(entities: Row[]): Promise<Row[]> {
    return entities;
  }
  protected async doSoftDelete(entity: Row): Promise<Row> {
    return entity;
  }
  protected async doRestore(entity: Row): Promise<Row> {
    return entity;
  }

  transform(entityLike: DeepPartial<Row>): Row {
    return Object.assign(new RowClass(), entityLike) as Row;
  }
  merge(mergeIntoEntity: Row, ...entityLikes: DeepPartial<Row>[]): Row {
    return Object.assign(mergeIntoEntity, ...entityLikes);
  }
}

/** A context carrying route-declared hooks, as the interceptor would build. */
const ctxWithHooks = (...hooks: Type[]): AppContextHost => {
  const ctx = new AppContextHost();
  ctx.defineOverlay(HooksCtx, {
    hooks: hooks.map((hook) => ({ hook, type: RepoHook.KEY })),
  });
  return ctx;
};

describe('repository hook registration', () => {
  let moduleRef: DeepMockProxy<ModuleRef>;
  let resolver: HookResolverService;

  beforeEach(() => {
    secondHookCalls.length = 0;
    const instances = new Map<unknown, unknown>([
      [StampHook, new StampHook()],
      [SecondHook, new SecondHook()],
    ]);

    moduleRef = mockDeep<ModuleRef>();
    moduleRef.get.mockImplementation((token) => instances.get(token));

    resolver = new HookResolverService(moduleRef, new Reflector());
  });

  const bound = (...hooks: Type[]): StampAdapter => {
    const adapter = new StampAdapter('rows', resolver, undefined, hooks);
    adapter.setHooks(hooks);
    return adapter;
  };

  // The reported failure: a hook on one entity forwards its ctx into another
  // entity's repository, and that entity's own hooks never run. The forwarded
  // context carries the *caller's* hook list, so the only way this passes is
  // if resolution stopped depending on the context.
  it('runs a registered hook on a context that carries none of its own', async () => {
    const adapter = bound(StampHook);

    await adapter.create({ id: 'row-1' }, { ctx: ctxWithHooks() });

    expect(adapter.created[0]?.owner).toBe('stamped');
  });

  it('runs a registered hook when the call carries no context at all', async () => {
    const adapter = bound(StampHook);

    await adapter.create({ id: 'row-1' });

    expect(adapter.created[0]?.owner).toBe('stamped');
  });

  it('still runs a route-declared hook that was never registered', async () => {
    const adapter = new StampAdapter('rows', resolver);

    await adapter.create({ id: 'row-1' }, { ctx: ctxWithHooks(StampHook) });

    expect(adapter.created[0]?.owner).toBe('stamped');
  });

  it('runs both a registered and a route-declared hook', async () => {
    const adapter = bound(StampHook);

    await adapter.create({ id: 'row-1' }, { ctx: ctxWithHooks(SecondHook) });

    expect(adapter.created[0]?.owner).toBe('stamped');
    expect(secondHookCalls).toEqual(['row-1']);
  });

  // A class listed twice in one registration is a typo with no useful reading,
  // and running it twice is silent — a doubled stamp looks identical, a doubled
  // audit writes two rows.
  it('refuses the same class registered twice for one entity', () => {
    const adapter = new StampAdapter('rows', resolver, undefined, [
      SecondHook,
      SecondHook,
    ]);

    expect(() => adapter.setHooks([SecondHook, SecondHook])).toThrow(
      HookBootException,
    );
  });

  describe('a hook that is both registered and route-declared', () => {
    // Asserting the *count* is the point: a dedupe that failed would still
    // leave `owner` stamped, so an assertion on the value alone would pass.
    it('runs once, not twice', async () => {
      const adapter = bound(SecondHook);

      await adapter.create({ id: 'row-1' }, { ctx: ctxWithHooks(SecondHook) });

      expect(secondHookCalls).toEqual(['row-1']);
    });

    it('warns, naming the route as the redundant one', async () => {
      const emitWarning = vi
        .spyOn(process, 'emitWarning')
        .mockImplementation(() => undefined);
      const adapter = bound(StampHook);

      await adapter.create({ id: 'row-1' }, { ctx: ctxWithHooks(StampHook) });

      // Both messages mention `@UseHooks()`, so asserting that alone passes
      // with the two branches swapped. `registered for` is what distinguishes
      // them.
      expect(emitWarning).toHaveBeenCalledOnce();
      expect(emitWarning.mock.calls[0]?.[0]).toContain(
        'is registered for "rows" and also',
      );
      expect(emitWarning.mock.calls[0]?.[1]).toEqual({
        code: 'ROCKETS_HOOKS_DUPLICATE',
      });

      emitWarning.mockRestore();
    });

    it('tells an unregistered duplicate to drop one of its route entries', async () => {
      const emitWarning = vi
        .spyOn(process, 'emitWarning')
        .mockImplementation(() => undefined);
      // StampHook is the registered one; SecondHook arrives twice from routes
      // and is not registered at all, so advice to drop "the @UseHooks entry"
      // as redundant would delete it outright.
      const adapter = bound(StampHook);

      await adapter.create(
        { id: 'row-1' },
        { ctx: ctxWithHooks(SecondHook, SecondHook) },
      );

      expect(emitWarning).toHaveBeenCalledOnce();
      expect(emitWarning.mock.calls[0]?.[0]).toContain(
        'reached "rows" twice on the same context',
      );

      emitWarning.mockRestore();
    });

    it('warns once however many calls are made', async () => {
      const emitWarning = vi
        .spyOn(process, 'emitWarning')
        .mockImplementation(() => undefined);
      const adapter = bound(StampHook);
      const ctx = ctxWithHooks(StampHook);

      await adapter.create({ id: 'row-1' }, { ctx });
      await adapter.create({ id: 'row-2' }, { ctx });
      await adapter.create({ id: 'row-3' }, { ctx });

      expect(emitWarning).toHaveBeenCalledOnce();

      emitWarning.mockRestore();
    });
  });

  describe('declared but unbound', () => {
    // Without this the registration would reintroduce the silence it exists to
    // remove: an entity whose binding was missed looks exactly like one that
    // registered no hooks.
    it('refuses the call rather than running as though there were no hooks', async () => {
      const unbound = new StampAdapter('rows', resolver, undefined, [
        StampHook,
      ]);

      await expect(unbound.create({ id: 'row-1' })).rejects.toThrow(
        HookBootException,
      );
      expect(unbound.created).toEqual([]);
    });

    it('does not refuse an entity that declared no hooks', async () => {
      const none = new StampAdapter('rows', resolver);

      await expect(none.create({ id: 'row-1' })).resolves.toBeTruthy();
    });

    // This one returns before the permeator, so it needs the guard invoked
    // explicitly — it was the single operation that stayed unrefused.
    it('refuses a no-op softDelete of an already-deleted row', async () => {
      const unbound = new StampAdapter('rows', resolver, undefined, [
        StampHook,
      ]);

      await expect(
        unbound.softDelete({
          id: 'row-1',
          owner: null,
          dateDeleted: new Date(),
        }),
      ).rejects.toThrow(HookBootException);
    });
  });

  describe('declared with no hook resolver at all', () => {
    // `CoreModule` not imported, so there is nothing to run hooks with. The
    // declaration is the only reason we can tell this apart from an entity
    // that wants no hooks, and it is the one omission that would otherwise
    // reproduce exactly the silence this registration removes.
    it('refuses rather than writing the row unhooked', async () => {
      const noResolver = new StampAdapter('rows', undefined, undefined, [
        StampHook,
      ]);
      noResolver.setHooks([StampHook]);

      await expect(noResolver.create({ id: 'row-1' })).rejects.toThrow(
        HookBootException,
      );
      expect(noResolver.created).toEqual([]);
    });

    it('still serves an entity that declared none', async () => {
      const noResolver = new StampAdapter('rows');

      await expect(noResolver.create({ id: 'row-1' })).resolves.toBeTruthy();
    });
  });

  it('binds once', () => {
    const adapter = bound(StampHook);

    expect(() => adapter.setHooks([SecondHook])).toThrow(HookBootException);
  });
});
