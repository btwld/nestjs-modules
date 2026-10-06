import { mock } from 'vitest-mock-extended';

import {
  type ExecutionContext,
  HttpStatus,
  Injectable,
  Module,
  type PlainLiteralObject,
  Scope,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  AppContextHost,
  getAppContext,
  RuntimeException,
} from '@concepta/nestjs-core';
import {
  EntityAlreadyExistsException,
  getDynamicRepositoryToken,
  PrimaryKeyImmutableException,
  RepositoryModule,
  RowScopeBootException,
  RowScopeCtx,
  Where,
} from '@concepta/nestjs-repository';

import { CurrencyEntityFixture } from '../../__fixtures__/row-scope/currency.entity.fixture.js';
import { DocEntityFixture } from '../../__fixtures__/row-scope/doc.entity.fixture.js';
import { OrderLineEntityFixture } from '../../__fixtures__/row-scope/order-line.entity.fixture.js';
import { OrderEntityFixture } from '../../__fixtures__/row-scope/order.entity.fixture.js';
import { ProfileEntityFixture } from '../../__fixtures__/row-scope/profile.entity.fixture.js';
import {
  ROW_SCOPE_CURRENCY_TOKEN,
  ROW_SCOPE_DOC_TOKEN,
  ROW_SCOPE_PROFILE_TOKEN,
  ROW_SCOPE_ORDER_LINE_TOKEN,
  ROW_SCOPE_ORDER_TOKEN,
  RowScopeAppModuleFixture,
  rowScopeOrmConfig,
} from '../../__fixtures__/row-scope/row-scope-app.module.fixture.js';
import { TenantRowScopeFixture } from '../../__fixtures__/row-scope/tenant-row-scope.fixture.js';
import { TenantScopeOverlayFixture } from '../../__fixtures__/row-scope/tenant-scope-overlay.fixture.js';
import { TypeOrmRepositoryModule } from '../../typeorm-repository.module.js';
import { TypeOrmRepository } from '../typeorm-repository.js';

/**
 * Builds the context a `ContextOverlayInterceptor` would have built: a real
 * `AppContextHost` carrying an immutable `RowScopeCtx`. Scope arrives this way
 * and no other — a plain `{ tenantId }` property would be ignored.
 */
const ctxFor = (tenantId: string): AppContextHost => {
  const ctx = new AppContextHost();
  ctx.defineOverlay(RowScopeCtx, { tenantId }, { immutable: true });
  return ctx;
};

const ACME = ctxFor('acme');
const GLOBEX = ctxFor('globex');

describe('row scope (typeorm, end to end)', () => {
  let moduleFixture: TestingModule;
  let orders: TypeOrmRepository<OrderEntityFixture>;
  let orderLines: TypeOrmRepository<OrderLineEntityFixture>;

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [RowScopeAppModuleFixture],
    }).compile();

    // Binding happens during init, before anything can serve a call.
    await moduleFixture.init();

    orders = moduleFixture.get<TypeOrmRepository<OrderEntityFixture>>(
      getDynamicRepositoryToken(ROW_SCOPE_ORDER_TOKEN),
    );
    orderLines = moduleFixture.get<TypeOrmRepository<OrderLineEntityFixture>>(
      getDynamicRepositoryToken(ROW_SCOPE_ORDER_LINE_TOKEN),
    );

    await orders.create({ description: 'acme order' }, { ctx: ACME });
    await orders.create({ description: 'globex order' }, { ctx: GLOBEX });
  });

  afterEach(async () => {
    await moduleFixture.close();
  });

  describe('reads', () => {
    it('returns only the rows the caller is scoped to', async () => {
      const found = await orders.find({ ctx: ACME });

      expect(found.map((order) => order.description)).toEqual(['acme order']);
    });

    it('scopes a read that already carries its own where clause', async () => {
      const found = await orders.find({
        where: Where.eq('description', 'globex order'),
        ctx: ACME,
      });

      expect(found).toEqual([]);
    });

    it('cannot reach another tenant row by id', async () => {
      const [globexOrder] = await orders.find({ ctx: GLOBEX });

      const found = await orders.findOne({
        where: Where.eq('id', globexOrder.id),
        ctx: ACME,
      });

      expect(found).toBeNull();
    });

    it('counts only rows in scope', async () => {
      expect(await orders.count({ ctx: ACME })).toBe(1);
    });
  });

  describe('writes', () => {
    it('stamps a create that does not name a tenant', async () => {
      const created = await orders.create(
        { description: 'stamped' },
        { ctx: ACME },
      );

      expect(created.tenantId).toBe('acme');
    });

    it('refuses a create naming another tenant rather than rewriting it', async () => {
      await expect(
        orders.create(
          { description: 'smuggled', tenantId: 'globex' },
          { ctx: ACME },
        ),
      ).rejects.toThrow(RuntimeException);

      // And nothing was written under the caller's own tenant instead.
      const found = await orders.find({ ctx: ACME });
      expect(found.map((order) => order.description)).toEqual(['acme order']);
    });

    // A create naming an existing row is an overwrite, because this driver
    // implements create as a save-by-primary-key. Unrefused, that overwrites
    // *and* re-tenants the row, so it vanishes from its owner's reads. Each
    // case therefore asserts the victim still sees its untouched row —
    // asserting only the refusal would not catch the theft.
    it('refuses a create carrying another tenant primary key', async () => {
      const [globexOrder] = await orders.find({ ctx: GLOBEX });

      await expect(
        orders.create(
          { id: globexOrder.id, description: 'HIJACKED' },
          { ctx: ACME },
        ),
      ).rejects.toThrow(RuntimeException);

      const globexSees = await orders.find({ ctx: GLOBEX });
      expect(globexSees.map((order) => order.description)).toEqual([
        'globex order',
      ]);
    });

    it('refuses the same hijack through createMany', async () => {
      const [globexOrder] = await orders.find({ ctx: GLOBEX });

      await expect(
        orders.createMany(
          [
            { description: 'innocent' },
            { id: globexOrder.id, description: 'HIJACKED' },
          ],
          { ctx: ACME },
        ),
      ).rejects.toThrow(RuntimeException);

      const globexSees = await orders.find({ ctx: GLOBEX });
      expect(globexSees.map((order) => order.description)).toEqual([
        'globex order',
      ]);
    });

    it('allows a create with a caller-supplied new primary key', async () => {
      // No scope check on create — the adapter refuses a key that already
      // names a row, so a new key is simply an insert.
      const created = await orders.create(
        { id: '00000000-0000-4000-8000-000000000000', description: 'new' },
        { ctx: ACME },
      );

      expect(created.tenantId).toBe('acme');
    });

    it('allows an upsert against the caller own visible row', async () => {
      // The companion to the refusal cases: proves a stamped upsert lands on
      // the caller's own row without re-tenanting it.
      const [acmeOrder] = await orders.find({ ctx: ACME });

      const upserted = await orders.upsert(
        { id: acmeOrder.id, description: 'revised' },
        { ctx: ACME },
      );

      expect(upserted.tenantId).toBe('acme');
      const found = await orders.find({ ctx: ACME });
      expect(found.map((order) => order.description)).toEqual(['revised']);
    });

    it('allows an upsert whose key names no row to insert', async () => {
      // The key is complete and matches nothing, so the conflict clause cannot
      // fire and there is no existing row to own — the upsert inserts, stamped.
      const id = '00000000-0000-4000-8000-00000000beef';

      const upserted = await orders.upsert(
        { id, description: 'brand new' },
        { ctx: ACME },
      );

      expect(upserted.tenantId).toBe('acme');

      const acmeSees = await orders.find({ ctx: ACME });
      expect(acmeSees.map((order) => order.description).sort()).toEqual([
        'acme order',
        'brand new',
      ]);
      // It did not leak into another tenant's scope on the way in.
      expect(await orders.count({ ctx: GLOBEX })).toBe(1);
    });

    it('refuses an insert-shaped upsert carrying another tenant scope', async () => {
      const id = '00000000-0000-4000-8000-00000000cafe';

      // `description` is included deliberately: a payload the database would
      // reject anyway proves nothing about row scope, since the NOT NULL
      // violation satisfies a bare `toThrow` on its own. The status is
      // asserted for the same reason.
      await expect(
        orders.upsert(
          { id, description: 'smuggled', tenantId: 'globex' },
          { ctx: ACME },
        ),
      ).rejects.toMatchObject({ httpStatus: HttpStatus.FORBIDDEN });

      expect(await orders.count({ ctx: GLOBEX })).toBe(1);
      expect(await orders.count({ ctx: ACME })).toBe(1);
    });

    it('refuses a delete aimed at another tenant row', async () => {
      const [globexOrder] = await orders.find({ ctx: GLOBEX });

      await expect(orders.delete(globexOrder, { ctx: ACME })).rejects.toThrow(
        RuntimeException,
      );

      expect(await orders.count({ ctx: GLOBEX })).toBe(1);
    });

    it('allows a delete of the caller own row', async () => {
      const [acmeOrder] = await orders.find({ ctx: ACME });

      await orders.delete(acmeOrder, { ctx: ACME });

      expect(await orders.count({ ctx: ACME })).toBe(0);
    });

    it('is not fooled by a target claiming the caller own tenant', async () => {
      const [globexOrder] = await orders.find({ ctx: GLOBEX });

      // The resolver reads the row's real scope back through its own scoped
      // repository, so what the caller asserts about the target is irrelevant.
      const forged = { ...globexOrder, tenantId: 'acme' };

      await expect(orders.delete(forged, { ctx: ACME })).rejects.toThrow(
        RuntimeException,
      );
      expect(await orders.count({ ctx: GLOBEX })).toBe(1);
    });

    it('refuses an update whose value points at another tenant row', async () => {
      const [globexOrder] = await orders.find({ ctx: GLOBEX });
      const [acmeOrder] = await orders.find({ ctx: ACME });

      // The visibility check passes — acmeOrder really is the caller's. But
      // the driver merges value over target, so a primary key in the value is
      // what decides which row is written.
      await expect(
        orders.update(
          acmeOrder,
          { id: globexOrder.id, description: 'hijacked' },
          { ctx: ACME },
        ),
      ).rejects.toThrow(RuntimeException);

      const [globexAfter] = await orders.find({ ctx: GLOBEX });
      expect(globexAfter.description).toEqual('globex order');
      expect(globexAfter.tenantId).toEqual('globex');
    });

    it('refuses a replace whose value points at another tenant row', async () => {
      const [globexOrder] = await orders.find({ ctx: GLOBEX });
      const [acmeOrder] = await orders.find({ ctx: ACME });

      await expect(
        orders.replace(
          acmeOrder,
          { id: globexOrder.id, description: 'hijacked' },
          { ctx: ACME },
        ),
      ).rejects.toThrow(RuntimeException);

      expect((await orders.find({ ctx: GLOBEX }))[0].description).toEqual(
        'globex order',
      );
    });

    it('allows an update that stays on the caller own row', async () => {
      const [acmeOrder] = await orders.find({ ctx: ACME });

      const updated = await orders.update(
        acmeOrder,
        { description: 'renamed' },
        { ctx: ACME },
      );

      expect(updated.description).toEqual('renamed');
      expect(updated.tenantId).toEqual('acme');
    });

    it('refuses an update aimed at another tenant row', async () => {
      const [globexOrder] = await orders.find({ ctx: GLOBEX });

      await expect(
        orders.update(globexOrder, { description: 'hijacked' }, { ctx: ACME }),
      ).rejects.toThrow(RuntimeException);
    });

    it('refuses an update that would re-tenant the caller own row', async () => {
      // Rule 4 on the write-to-an-existing-row path. Unrefused, this is a row
      // the caller gives away: the version-guarded save merges the data over
      // the stored row, so the scope column goes with it and the row leaves
      // the caller's scope for someone else's.
      const [acmeOrder] = await orders.find({ ctx: ACME });

      await expect(
        orders.update(
          acmeOrder,
          { description: 'renamed', tenantId: 'globex' },
          { ctx: ACME },
        ),
      ).rejects.toMatchObject({ httpStatus: HttpStatus.FORBIDDEN });

      expect(await orders.count({ ctx: ACME })).toBe(1);
      expect(await orders.count({ ctx: GLOBEX })).toBe(1);
      expect((await orders.find({ ctx: ACME }))[0].description).toEqual(
        'acme order',
      );
    });

    it('refuses a replace that would re-tenant the caller own row', async () => {
      const [acmeOrder] = await orders.find({ ctx: ACME });

      await expect(
        orders.replace(
          acmeOrder,
          { description: 'renamed', tenantId: 'globex' },
          { ctx: ACME },
        ),
      ).rejects.toMatchObject({ httpStatus: HttpStatus.FORBIDDEN });

      expect(await orders.count({ ctx: ACME })).toBe(1);
      expect(await orders.count({ ctx: GLOBEX })).toBe(1);
    });

    it('stamps a createMany and refuses one naming another tenant', async () => {
      const created = await orders.createMany(
        [{ description: 'a' }, { description: 'b' }],
        { ctx: ACME },
      );
      expect(created.map((o) => o.tenantId)).toEqual(['acme', 'acme']);

      await expect(
        orders.createMany(
          [{ description: 'c' }, { description: 'd', tenantId: 'globex' }],
          { ctx: ACME },
        ),
      ).rejects.toThrow(RuntimeException);
      // All or nothing — 'c' was not written either.
      expect(await orders.count({ ctx: ACME })).toBe(3);
    });

    it('refuses softDelete and restore aimed at another tenant row', async () => {
      const [globexOrder] = await orders.find({ ctx: GLOBEX });

      await expect(
        orders.softDelete(globexOrder, { ctx: ACME }),
      ).rejects.toThrow(RuntimeException);
      await expect(orders.restore(globexOrder, { ctx: ACME })).rejects.toThrow(
        RuntimeException,
      );
    });

    it('allows softDelete then restore of the caller own row', async () => {
      const [acmeOrder] = await orders.find({ ctx: ACME });

      await orders.softDelete(acmeOrder, { ctx: ACME });
      expect(await orders.count({ ctx: ACME })).toBe(0);

      await orders.restore(acmeOrder, { ctx: ACME });
      expect(await orders.count({ ctx: ACME })).toBe(1);
    });

    it('refuses an upsert against another tenant row', async () => {
      const [globexOrder] = await orders.find({ ctx: GLOBEX });

      await expect(
        orders.upsert(
          { id: globexOrder.id, description: 'hijacked' },
          { ctx: ACME },
        ),
      ).rejects.toThrow(RuntimeException);

      expect((await orders.find({ ctx: GLOBEX }))[0].description).toEqual(
        'globex order',
      );
    });

    it('refuses an entire deleteMany batch when one element is out of scope', async () => {
      const [acmeOrder] = await orders.find({ ctx: ACME });
      const [globexOrder] = await orders.find({ ctx: GLOBEX });

      await expect(
        orders.deleteMany([acmeOrder, globexOrder], { ctx: ACME }),
      ).rejects.toThrow(RuntimeException);

      // All or nothing — the in-scope row is still there too.
      expect(await orders.count({ ctx: ACME })).toBe(1);
      expect(await orders.count({ ctx: GLOBEX })).toBe(1);
    });
  });

  describe('foreign keys between two scoped entities', () => {
    it('allows a line pointing at an order in the same tenant', async () => {
      const [acmeOrder] = await orders.find({ ctx: ACME });

      const line = await orderLines.create(
        { sku: 'widget', orderId: acmeOrder.id },
        { ctx: ACME },
      );

      expect(line.tenantId).toEqual('acme');
    });

    it('refuses a line pointing at another tenant order', async () => {
      const [globexOrder] = await orders.find({ ctx: GLOBEX });

      // The line itself would be stamped 'acme' and look perfectly in-scope;
      // only the peer-repository read catches where it points.
      await expect(
        orderLines.create(
          { sku: 'smuggled', orderId: globexOrder.id },
          { ctx: ACME },
        ),
      ).rejects.toThrow(RuntimeException);

      expect(await orderLines.count({ ctx: ACME })).toBe(0);
    });

    it('refuses moving an existing line onto another tenant order', async () => {
      const [acmeOrder] = await orders.find({ ctx: ACME });
      const [globexOrder] = await orders.find({ ctx: GLOBEX });
      const line = await orderLines.create(
        { sku: 'widget', orderId: acmeOrder.id },
        { ctx: ACME },
      );

      await expect(
        orderLines.update(line, { orderId: globexOrder.id }, { ctx: ACME }),
      ).rejects.toThrow(RuntimeException);
    });

    it('refuses a line update redirected by an id in the value', async () => {
      const [acmeOrder] = await orders.find({ ctx: ACME });
      const [globexOrder] = await orders.find({ ctx: GLOBEX });
      const mine = await orderLines.create(
        { sku: 'mine', orderId: acmeOrder.id },
        { ctx: ACME },
      );
      const theirs = await orderLines.create(
        { sku: 'theirs', orderId: globexOrder.id },
        { ctx: GLOBEX },
      );

      await expect(
        orderLines.update(
          mine,
          { id: theirs.id, sku: 'hijacked' },
          { ctx: ACME },
        ),
      ).rejects.toThrow(RuntimeException);

      const [after] = await orderLines.find({ ctx: GLOBEX });
      expect(after.sku).toEqual('theirs');
    });

    it('refuses a line upsert against another tenant row', async () => {
      const [acmeOrder] = await orders.find({ ctx: ACME });
      const [globexOrder] = await orders.find({ ctx: GLOBEX });
      const theirs = await orderLines.create(
        { sku: 'theirs', orderId: globexOrder.id },
        { ctx: GLOBEX },
      );

      // orderId points at the caller's own order, so the FK check passes and
      // every column is supplied — the upsert's visibility read on the
      // foreign line id is the only thing that can refuse this.
      await expect(
        orderLines.upsert(
          { id: theirs.id, sku: 'hijacked', orderId: acmeOrder.id },
          { ctx: ACME },
        ),
      ).rejects.toThrow(RuntimeException);

      expect((await orderLines.find({ ctx: GLOBEX }))[0].sku).toEqual('theirs');
    });

    it('refuses a line whose FK arrives via the relation object', async () => {
      const [globexOrder] = await orders.find({ ctx: GLOBEX });

      // `order` and `orderId` write the same column. Checking only the scalar
      // would let this through and the driver would derive orderId from the
      // relation on save.
      await expect(
        orderLines.create(
          { sku: 'smuggled', order: { id: globexOrder.id } },
          { ctx: ACME },
        ),
      ).rejects.toThrow(RuntimeException);

      expect(await orderLines.count({ ctx: ACME })).toBe(0);
    });

    it('refuses a line whose two FK routes disagree', async () => {
      const [acmeOrder] = await orders.find({ ctx: ACME });
      const [globexOrder] = await orders.find({ ctx: GLOBEX });

      await expect(
        orderLines.create(
          {
            sku: 'ambiguous',
            orderId: acmeOrder.id,
            order: { id: globexOrder.id },
          },
          { ctx: ACME },
        ),
      ).rejects.toThrow(RuntimeException);
    });

    it('scopes line reads independently of orders', async () => {
      const [acmeOrder] = await orders.find({ ctx: ACME });
      await orderLines.create(
        { sku: 'widget', orderId: acmeOrder.id },
        { ctx: ACME },
      );

      expect(await orderLines.count({ ctx: ACME })).toBe(1);
      expect(await orderLines.count({ ctx: GLOBEX })).toBe(0);
    });
  });

  describe('a composite key whose second column has a default', () => {
    let docs: TypeOrmRepository<DocEntityFixture>;

    beforeEach(async () => {
      docs = moduleFixture.get<TypeOrmRepository<DocEntityFixture>>(
        getDynamicRepositoryToken(ROW_SCOPE_DOC_TOKEN),
      );

      // Seeded through the *scoped* repository, with caller-supplied natural
      // primary keys — which is the point: a caller-supplied key on a new row
      // is allowed, so row scope stays usable for this kind of entity.
      await docs.create(
        { slug: 'home', locale: 'en', body: 'globex private' },
        { ctx: GLOBEX },
      );
      await docs.create(
        { slug: 'home', locale: 'fr', body: 'acme private' },
        { ctx: ACME },
      );
    });

    it('creates with a caller-supplied natural key and stamps it', async () => {
      const created = await docs.create(
        { slug: 'about', locale: 'en', body: 'acme about' },
        { ctx: ACME },
      );

      expect(created).toEqual({
        slug: 'about',
        locale: 'en',
        body: 'acme about',
        tenantId: 'acme',
      });
    });

    it('refuses a create naming another tenant existing key, leaving it intact', async () => {
      // Refused by the adapter's create guard now rather than by a scope
      // check — the outcome is what matters, so assert the victim row too.
      await expect(
        docs.create(
          { slug: 'home', locale: 'en', body: 'HIJACKED' },
          { ctx: ACME },
        ),
      ).rejects.toThrow(RuntimeException);

      const globexSees = await docs.find({ ctx: GLOBEX });
      expect(globexSees.map((doc) => doc.body)).toEqual(['globex private']);
    });

    // This was a confirmed, silent cross-tenant overwrite. Supplying only
    // `slug` was classified as an insert, because a partial key cannot be
    // looked up — but the driver conflicts on the real primary columns, the
    // default filled in `locale`, and globex's row was overwritten *and*
    // re-tenanted, vanishing from its owner's reads.
    it('refuses an upsert that supplies only part of the key', async () => {
      await expect(
        docs.upsert({ slug: 'home', body: 'HIJACKED' }, { ctx: ACME }),
      ).rejects.toThrow(RuntimeException);

      const globexSees = await docs.find({ ctx: GLOBEX });
      expect(globexSees.map((doc) => doc.body)).toEqual(['globex private']);
    });

    // Asserts BAD_REQUEST specifically: the table's own constraints would
    // reject this call too, so a bare "it threw" assertion would pass even
    // with the scope check deleted and prove nothing.
    it('refuses a keyless upsert', async () => {
      const error = await docs
        .upsert({ body: 'HIJACKED' }, { ctx: ACME })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(RuntimeException);
      expect(error).toMatchObject({ httpStatus: HttpStatus.BAD_REQUEST });

      const globexSees = await docs.find({ ctx: GLOBEX });
      expect(globexSees.map((doc) => doc.body)).toEqual(['globex private']);
    });

    it('scopes the default resolveScope end to end', async () => {
      // The only fixture that exercises the unmodified default resolver, and
      // the only end-to-end proof that the configured scopeKey/column path
      // works at all.
      expect((await docs.find({ ctx: ACME })).map((doc) => doc.body)).toEqual([
        'acme private',
      ]);
      expect(await docs.count({ ctx: GLOBEX })).toBe(1);
    });

    it('refuses an update aimed at another tenant row', async () => {
      const [globexDoc] = await docs.find({ ctx: GLOBEX });

      await expect(
        docs.update(globexDoc, { body: 'HIJACKED' }, { ctx: ACME }),
      ).rejects.toThrow(RuntimeException);

      const globexSees = await docs.find({ ctx: GLOBEX });
      expect(globexSees.map((doc) => doc.body)).toEqual(['globex private']);
    });

    it('refuses an update that would re-tenant the caller own row', async () => {
      // Rule 4 on the unversioned write path: `Doc` carries no version column,
      // so this is merge-then-save rather than the compare-and-swap the
      // `Order` fixture takes. The scope column still must not travel.
      const [acmeDoc] = await docs.find({ ctx: ACME });

      await expect(
        docs.update(acmeDoc, { tenantId: 'globex' }, { ctx: ACME }),
      ).rejects.toMatchObject({ httpStatus: HttpStatus.FORBIDDEN });

      expect((await docs.find({ ctx: ACME })).map((doc) => doc.body)).toEqual([
        'acme private',
      ]);
      expect(await docs.count({ ctx: GLOBEX })).toBe(1);
    });
  });

  describe('a primary key that is also a join column', () => {
    let profiles: TypeOrmRepository<ProfileEntityFixture>;
    let globexOrder: OrderEntityFixture;
    let acmeOrder: OrderEntityFixture;

    beforeEach(async () => {
      profiles = moduleFixture.get<TypeOrmRepository<ProfileEntityFixture>>(
        getDynamicRepositoryToken(ROW_SCOPE_PROFILE_TOKEN),
      );

      [globexOrder] = await orders.find({ ctx: GLOBEX });
      [acmeOrder] = await orders.find({ ctx: ACME });

      await profiles.create(
        { orderId: globexOrder.id, bio: 'globex private' },
        { ctx: GLOBEX },
      );
    });

    // A driver resolves the column from the relation when the scalar is
    // absent, and prefers it — so a guard reading only `value.orderId` saw no
    // key at all. Both of these were confirmed cross-tenant writes: the victim
    // row was overwritten *and* re-tenanted, so it left its owner's reads.
    it('refuses a create whose key arrives via the relation object', async () => {
      await expect(
        profiles.create(
          { order: { id: globexOrder.id }, bio: 'HIJACKED' },
          { ctx: ACME },
        ),
      ).rejects.toThrow(EntityAlreadyExistsException);

      const globexSees = await profiles.find({ ctx: GLOBEX });
      expect(globexSees.map((profile) => profile.bio)).toEqual([
        'globex private',
      ]);
    });

    it('refuses an update redirected via the relation object', async () => {
      const own = await profiles.create(
        { orderId: acmeOrder.id, bio: 'acme own' },
        { ctx: ACME },
      );

      await expect(
        profiles.update(
          own,
          { order: { id: globexOrder.id }, bio: 'HIJACKED' },
          { ctx: ACME },
        ),
      ).rejects.toThrow(PrimaryKeyImmutableException);

      const globexSees = await profiles.find({ ctx: GLOBEX });
      expect(globexSees.map((profile) => profile.bio)).toEqual([
        'globex private',
      ]);
    });

    it('ignores a relation planted on the entity argument of an update', async () => {
      // The relation is on the *entity* (the row being named), not the data.
      // Stripped, the scalar decides and the write lands on the caller's own
      // row; unstripped, the driver would resolve the key from the relation
      // and the pre-check would 404 instead of succeeding — so the resolve
      // half of this assertion is what discriminates.
      const own = await profiles.create(
        { orderId: acmeOrder.id, bio: 'acme own' },
        { ctx: ACME },
      );

      await profiles.update(
        { ...own, order: globexOrder },
        { bio: 'renamed' },
        { ctx: ACME },
      );

      expect((await profiles.find({ ctx: ACME })).map((p) => p.bio)).toEqual([
        'renamed',
      ]);
      expect((await profiles.find({ ctx: GLOBEX })).map((p) => p.bio)).toEqual([
        'globex private',
      ]);
    });

    it('ignores a relation planted on the entity argument of a delete', async () => {
      const own = await profiles.create(
        { orderId: acmeOrder.id, bio: 'acme own' },
        { ctx: ACME },
      );

      await profiles.delete({ ...own, order: globexOrder }, { ctx: ACME });

      expect(await profiles.count({ ctx: ACME })).toBe(0);
      expect((await profiles.find({ ctx: GLOBEX })).map((p) => p.bio)).toEqual([
        'globex private',
      ]);
    });

    it('still allows a create whose key arrives via the relation object', async () => {
      const created = await profiles.create(
        { order: { id: acmeOrder.id }, bio: 'acme own' },
        { ctx: ACME },
      );

      // Field-wise rather than a whole-object compare: the created entity also
      // carries back the `order` relation object it was given, whose shape is
      // not what this asserts.
      expect(created.orderId).toBe(acmeOrder.id);
      expect(created.tenantId).toBe('acme');
    });
  });

  describe('a cross-tenant reader', () => {
    const ADMIN = (() => {
      const ctx = new AppContextHost();
      ctx.defineOverlay(
        RowScopeCtx,
        { tenantId: 'acme', role: 'admin' },
        { immutable: true },
      );
      return ctx;
    })();

    it('reads every tenant rows', async () => {
      expect(await orders.count({ ctx: ADMIN })).toBe(2);
    });

    it('cannot hijack a row via a create carrying its primary key', async () => {
      // Refused by the adapter's create guard, before scope is consulted at
      // all — a cross-tenant reader gets no more leeway on create than anyone
      // else, because the key is already taken.
      const [globexOrder] = await orders.find({ ctx: GLOBEX });

      await expect(
        orders.create(
          { id: globexOrder.id, description: 'HIJACKED' },
          { ctx: ADMIN },
        ),
      ).rejects.toThrow(RuntimeException);

      const globexSees = await orders.find({ ctx: GLOBEX });
      expect(globexSees.map((order) => order.description)).toEqual([
        'globex order',
      ]);
    });

    it('gets no matching write bypass', async () => {
      const [globexOrder] = await orders.find({ ctx: GLOBEX });

      // scopeWrite has no admin branch, so writes stay scoped to the tenant
      // on the context even for a reader that can see everything.
      await expect(orders.delete(globexOrder, { ctx: ADMIN })).rejects.toThrow(
        RuntimeException,
      );
    });

    it('cannot upsert, create into, or lifecycle another tenant row', async () => {
      const [globexOrder] = await orders.find({ ctx: GLOBEX });

      await expect(
        orders.upsert(
          { id: globexOrder.id, description: 'taken' },
          { ctx: ADMIN },
        ),
      ).rejects.toThrow(RuntimeException);
      await expect(
        orders.create(
          { description: 'planted', tenantId: 'globex' },
          {
            ctx: ADMIN,
          },
        ),
      ).rejects.toThrow(RuntimeException);
      await expect(
        orders.softDelete(globexOrder, { ctx: ADMIN }),
      ).rejects.toThrow(RuntimeException);

      expect(await orders.count({ ctx: GLOBEX })).toBe(1);
    });

    it('is the deciding check on a peer FK read, where the read itself is unfiltered', async () => {
      const [globexOrder] = await orders.find({ ctx: GLOBEX });

      // Under admin the orders read is unfiltered, so the order *is* found —
      // only the tenant compare in OrderLineRowScopeFixture.scopeWrite
      // refuses this.
      await expect(
        orderLines.create(
          { sku: 'x', orderId: globexOrder.id },
          { ctx: ADMIN },
        ),
      ).rejects.toThrow(RuntimeException);
    });

    it('cannot update or re-tenant a row it can merely see', async () => {
      const [globexOrder] = await orders.find({ ctx: GLOBEX });

      // The visibility read runs through the admin's own unfiltered
      // scopeQuery, so presence alone would pass. The pre-check carries the
      // scope column in its own WHERE regardless, which is what stops a
      // widened read from widening a write.
      await expect(
        orders.update(globexOrder, { description: 'taken' }, { ctx: ADMIN }),
      ).rejects.toThrow(RuntimeException);
      await expect(
        orders.replace(globexOrder, { description: 'taken' }, { ctx: ADMIN }),
      ).rejects.toThrow(RuntimeException);

      const [after] = await orders.find({ ctx: GLOBEX });
      expect(after.tenantId).toEqual('globex');
      expect(after.description).toEqual('globex order');
    });
  });

  describe('scope arriving from an interceptor', () => {
    /** Runs the real interceptor against a request and returns its context. */
    const contextFromRequest = async (
      user: { tenantId?: string; role?: string } | undefined,
    ): Promise<PlainLiteralObject> => {
      const request = { user };
      // Derived rather than deep-imported from @nestjs/common/interfaces,
      // which the package's exports map does not expose.
      const httpHost = mock<ReturnType<ExecutionContext['switchToHttp']>>();
      httpHost.getRequest.mockReturnValue(request);

      const executionContext = mock<ExecutionContext>();
      executionContext.switchToHttp.mockReturnValue(httpHost);

      await new TenantScopeOverlayFixture().attach(executionContext);

      return getAppContext(request);
    };

    it('scopes a read to the authenticated principal tenant', async () => {
      const ctx = await contextFromRequest({ tenantId: 'acme' });

      const found = await orders.find({ ctx });

      expect(found.map((order) => order.description)).toEqual(['acme order']);
    });

    it('fails closed when the principal carries no tenant', async () => {
      const ctx = await contextFromRequest(undefined);

      await expect(orders.find({ ctx })).rejects.toThrow(RuntimeException);
    });
  });

  describe('an entity declared public', () => {
    it('serves every caller unscoped, and needs no scope on the context', async () => {
      const currencies = moduleFixture.get<
        TypeOrmRepository<CurrencyEntityFixture>
      >(getDynamicRepositoryToken(ROW_SCOPE_CURRENCY_TOKEN));

      await currencies.create({ code: 'USD', symbol: '$' }, { ctx: ACME });

      expect(await currencies.count({ ctx: GLOBEX })).toBe(1);
      // No RowScopeCtx at all — a public entity has no resolver to refuse.
      expect(await currencies.count({ ctx: new AppContextHost() })).toBe(1);
    });
  });

  describe('a call with no tenant on the context', () => {
    it('fails closed rather than returning everything', async () => {
      await expect(orders.find({ ctx: new AppContextHost() })).rejects.toThrow(
        RuntimeException,
      );
    });
  });
});

describe('row scope boot checks (typeorm, end to end)', () => {
  it('refuses to start when a driver module is registered directly', async () => {
    // `TypeOrmRepositoryModule.forFeature` called straight, rather than
    // through `RepositoryModule.forFeature`, builds the adapter but never
    // binds the resolver — so the declaration would be silently inert. The
    // boot service finds the adapter through discovery rather than through
    // the registration it skipped, which is the reason discovery is used
    // at all.
    @Module({
      providers: [TenantRowScopeFixture],
      exports: [TenantRowScopeFixture],
    })
    class ResolverModule {}

    @Module({
      imports: [
        TypeOrmModule.forRoot(rowScopeOrmConfig),
        RepositoryModule.forRoot({}),
        ResolverModule,
        TypeOrmRepositoryModule.forFeature([
          {
            key: ROW_SCOPE_ORDER_TOKEN,
            entity: OrderEntityFixture,
            rowScope: {
              access: 'scoped',
              resolver: TenantRowScopeFixture,
            },
          },
        ]),
      ],
    })
    class DriverDirectAppModule {}

    const moduleFixture = await Test.createTestingModule({
      imports: [DriverDirectAppModule],
    }).compile();

    await expect(moduleFixture.init()).rejects.toThrow(RowScopeBootException);
  });

  it('refuses to start when the resolver is request-scoped', async () => {
    // Nothing checks the resolver's scope directly. A request-scoped resolver
    // makes the binding provider's dependency tree non-static, so Nest never
    // instantiates it at bootstrap, `setRowScope` never runs, and the
    // resolvers-bound check fails. The guarantee is the same either way: a
    // resolver that cannot be bound must not serve traffic.
    @Injectable({ scope: Scope.REQUEST })
    class RequestScopedRowScopeFixture extends TenantRowScopeFixture {}

    @Module({
      providers: [RequestScopedRowScopeFixture],
      exports: [RequestScopedRowScopeFixture],
    })
    class RequestScopedResolverModule {}

    @Module({
      imports: [
        TypeOrmModule.forRoot(rowScopeOrmConfig),
        RepositoryModule.forRoot({}),
        RepositoryModule.forFeature({
          module: TypeOrmRepositoryModule,
          imports: [RequestScopedResolverModule],
          entities: [
            {
              key: ROW_SCOPE_ORDER_TOKEN,
              entity: OrderEntityFixture,
              rowScope: {
                access: 'scoped',
                resolver: RequestScopedRowScopeFixture,
              },
            },
          ],
        }),
      ],
    })
    class RequestScopedAppModule {}

    const moduleFixture = await Test.createTestingModule({
      imports: [RequestScopedAppModule],
    }).compile();

    // Left unclosed on purpose: the module never finished initializing, and
    // closing it re-runs the lifecycle that just threw.
    await expect(moduleFixture.init()).rejects.toThrow(RowScopeBootException);
  });

  describe('requireRowScopeDeclaration', () => {
    const appModuleWith = (
      requireRowScopeDeclaration: boolean,
    ): typeof RowScopeAppModuleFixture => {
      @Module({
        imports: [
          TypeOrmModule.forRoot(rowScopeOrmConfig),
          RepositoryModule.forRoot({ requireRowScopeDeclaration }),
          RepositoryModule.forFeature({
            module: TypeOrmRepositoryModule,
            // Deliberately undeclared.
            entities: [
              { key: ROW_SCOPE_ORDER_TOKEN, entity: OrderEntityFixture },
            ],
          }),
        ],
      })
      class UndeclaredAppModule {}

      return UndeclaredAppModule;
    };

    it('refuses to start on an undeclared entity when opted in', async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [appModuleWith(true)],
      }).compile();

      await expect(moduleFixture.init()).rejects.toThrow(RowScopeBootException);
    });

    it('starts on an undeclared entity by default', async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [appModuleWith(false)],
      }).compile();

      await expect(moduleFixture.init()).resolves.toBeDefined();

      await moduleFixture.close();
    });
  });
});
