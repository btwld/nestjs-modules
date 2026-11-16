import { Controller, Inject, PlainLiteralObject } from '@nestjs/common';

import { Ctx, Operation } from '@concepta/nestjs-core';

import { ConfigurableCrudOptionsTransformer } from '../../../crud.types.js';
import { CrudAdapter } from '../../adapters/crud.adapter.js';
import { CrudController } from '../../decorators/controller/crud-controller.decorator.js';
import { CrudCreate } from '../../decorators/operations/crud-create.decorator.js';
import { CrudList } from '../../decorators/operations/crud-list.decorator.js';
import { CrudRead } from '../../decorators/operations/crud-read.decorator.js';
import { CrudBody } from '../../decorators/params/crud-body.decorator.js';
import { CrudEntity } from '../../decorators/routes/crud-entity.decorator.js';
import { CrudDecoratorException } from '../../exceptions/crud-decorator.exception.js';
import { CrudCtx } from '../../interceptors/crud-context.overlay.js';
import { CrudContextInterface } from '../../interceptors/interfaces/crud-context.interface.js';
import { CrudAdapterResolver } from '../../resolvers/crud-adapter.resolver.js';
import { CrudResolverInterface } from '../../resolvers/interfaces/crud-resolver.interface.js';
import { ConfigurableCrudBuilder } from '../configurable-crud.builder.js';

interface TestEntity {
  id: string;
  name: string;
}

describe('ConfigurableCrudBuilder', () => {
  describe('build() - Path 1: Pre-decorated class', () => {
    it('should extract providers from a pre-decorated controller', () => {
      @CrudController({
        path: 'decorated',
        entity: 'Decorated',
      })
      class DecoratedController {
        constructor(
          @Inject(CrudAdapterResolver)
          protected readonly crudResolver: CrudResolverInterface,
        ) {}

        @CrudList()
        async list(@Ctx(CrudCtx) ctx: CrudContextInterface<TestEntity>) {
          return this.crudResolver.list(ctx);
        }

        @CrudRead()
        async read(@Ctx(CrudCtx) ctx: CrudContextInterface<TestEntity>) {
          return this.crudResolver.read(ctx);
        }

        @CrudCreate()
        async create(
          @Ctx(CrudCtx) ctx: CrudContextInterface<TestEntity>,
          @CrudBody() dto: TestEntity,
        ) {
          return this.crudResolver.create(ctx, dto);
        }
      }

      const builder = new ConfigurableCrudBuilder<TestEntity>({
        controller: { class: DecoratedController },
      });

      const result = builder.build();

      expect(result.controllers['DecoratedController']).toBe(
        DecoratedController,
      );
      expect(result.providers.length).toBeGreaterThanOrEqual(3);
      expect(result.adapters['CrudAdapter']).toBe(CrudAdapter);
      expect(result.queryHandlers['Decorated_list_Handler']).toBeDefined();
      expect(result.queryHandlers['Decorated_read_Handler']).toBeDefined();
      expect(result.commandHandlers['Decorated_create_Handler']).toBeDefined();
    });

    it('should throw when entity metadata is missing', () => {
      // Controller without @CrudController decorator → no entity metadata
      class BareController {
        async list() {
          return [];
        }
      }

      const builder = new ConfigurableCrudBuilder<TestEntity>({
        controller: { class: BareController },
      });

      expect(() => builder.build()).toThrow(
        'Controller BareController must have @CrudEntity or @CrudController with entity specified',
      );
    });

    it('should throw when @CrudEntity is applied without @CrudController', () => {
      // Realistic mistake: @CrudEntity alone never applies @CrudInit, so no
      // query/command classes get resolved and no adapter is registered —
      // this would otherwise boot clean and 500 on every request.
      @Controller('entity-only')
      @CrudEntity('TestEntity')
      class EntityOnlyController {
        @CrudList()
        async list(@Ctx(CrudCtx) ctx: CrudContextInterface<TestEntity>) {
          return ctx;
        }
      }

      const builder = new ConfigurableCrudBuilder<TestEntity>({
        controller: { class: EntityOnlyController },
      });

      expect(() => builder.build()).toThrow(CrudDecoratorException);
    });
  });

  describe('build() - Path 2: Generated controller', () => {
    it('should return providers array with adapter and handlers', () => {
      const builder = new ConfigurableCrudBuilder<TestEntity>({
        controller: {
          path: 'test-entity',
          entity: 'TestEntity',
        },
        operations: [
          { operation: Operation.List },
          { operation: Operation.Create },
        ],
      });

      const result = builder.build();

      // providers includes adapter provider + all handlers
      expect(result.providers).toBeInstanceOf(Array);
      expect(result.providers.length).toBe(3); // 1 adapter + 2 handlers
    });

    it('should return controllers map with generated controller', () => {
      const builder = new ConfigurableCrudBuilder<TestEntity>({
        controller: {
          path: 'test-entity',
          entity: 'TestEntity',
        },
        operations: [{ operation: Operation.List }],
      });

      const result = builder.build();

      expect(result.controllers['TestEntityController']).toBeDefined();
      expect(result.controllers['TestEntityController'].name).toBe(
        'TestEntityController',
      );
    });

    it('should return queries map with query classes for read operations', () => {
      const builder = new ConfigurableCrudBuilder<TestEntity>({
        controller: {
          path: 'test-entity',
          entity: 'TestEntity',
        },
        operations: [
          { operation: Operation.List },
          { operation: Operation.Read },
        ],
      });

      const result = builder.build();

      expect(result.queries['TestEntityCrudListQuery']).toBeDefined();
      expect(result.queries['TestEntityCrudListQuery'].name).toBe(
        'TestEntityCrudListQuery',
      );
      expect(result.queries['TestEntityCrudReadQuery']).toBeDefined();
      expect(result.queries['TestEntityCrudReadQuery'].name).toBe(
        'TestEntityCrudReadQuery',
      );
    });

    it('should return queryHandlers map with handler classes for read operations', () => {
      const builder = new ConfigurableCrudBuilder<TestEntity>({
        controller: {
          path: 'test-entity',
          entity: 'TestEntity',
        },
        operations: [
          { operation: Operation.List },
          { operation: Operation.Read },
        ],
      });

      const result = builder.build();

      expect(result.queryHandlers['TestEntity_list_Handler']).toBeDefined();
      expect(result.queryHandlers['TestEntity_list_Handler'].name).toBe(
        'TestEntity_list_Handler',
      );
      expect(result.queryHandlers['TestEntity_read_Handler']).toBeDefined();
      expect(result.queryHandlers['TestEntity_read_Handler'].name).toBe(
        'TestEntity_read_Handler',
      );
    });

    it('should return commands map with command classes for write operations', () => {
      const builder = new ConfigurableCrudBuilder<TestEntity>({
        controller: {
          path: 'test-entity',
          entity: 'TestEntity',
        },
        operations: [
          { operation: Operation.Create },
          { operation: Operation.Update },
          { operation: Operation.Delete },
          { operation: Operation.SoftDelete },
        ],
      });

      const result = builder.build();

      expect(result.commands['TestEntityCrudCreateCommand']).toBeDefined();
      expect(result.commands['TestEntityCrudCreateCommand'].name).toBe(
        'TestEntityCrudCreateCommand',
      );
      expect(result.commands['TestEntityCrudUpdateCommand']).toBeDefined();
      expect(result.commands['TestEntityCrudUpdateCommand'].name).toBe(
        'TestEntityCrudUpdateCommand',
      );
      expect(result.commands['TestEntityCrudDeleteCommand']).toBeDefined();
      expect(result.commands['TestEntityCrudDeleteCommand'].name).toBe(
        'TestEntityCrudDeleteCommand',
      );
      expect(result.commands['TestEntityCrudSoftDeleteCommand']).toBeDefined();
      expect(result.commands['TestEntityCrudSoftDeleteCommand'].name).toBe(
        'TestEntityCrudSoftDeleteCommand',
      );
    });

    it('should return commandHandlers map with handler classes for write operations', () => {
      const builder = new ConfigurableCrudBuilder<TestEntity>({
        controller: {
          path: 'test-entity',
          entity: 'TestEntity',
        },
        operations: [
          { operation: Operation.Create },
          { operation: Operation.Update },
          { operation: Operation.Delete },
          { operation: Operation.SoftDelete },
        ],
      });

      const result = builder.build();

      expect(result.commandHandlers['TestEntity_create_Handler']).toBeDefined();
      expect(result.commandHandlers['TestEntity_create_Handler'].name).toBe(
        'TestEntity_create_Handler',
      );
      expect(result.commandHandlers['TestEntity_update_Handler']).toBeDefined();
      expect(result.commandHandlers['TestEntity_update_Handler'].name).toBe(
        'TestEntity_update_Handler',
      );
      expect(result.commandHandlers['TestEntity_delete_Handler']).toBeDefined();
      expect(result.commandHandlers['TestEntity_delete_Handler'].name).toBe(
        'TestEntity_delete_Handler',
      );
      expect(
        result.commandHandlers['TestEntity_softDelete_Handler'],
      ).toBeDefined();
      expect(result.commandHandlers['TestEntity_softDelete_Handler'].name).toBe(
        'TestEntity_softDelete_Handler',
      );
    });

    it('should return adapters map with adapter class', () => {
      const builder = new ConfigurableCrudBuilder<TestEntity>({
        controller: {
          path: 'test-entity',
          entity: 'TestEntity',
        },
        operations: [{ operation: Operation.List }],
      });

      const result = builder.build();

      expect(result.adapters['CrudAdapter']).toBe(CrudAdapter);
    });

    it('should use controller name for class naming when provided', () => {
      const builder = new ConfigurableCrudBuilder<TestEntity>({
        controller: {
          path: 'test-entity',
          entity: 'TestEntity',
          name: 'CustomName',
        },
        operations: [{ operation: Operation.List }],
      });

      const result = builder.build();

      // Controller still uses entity for class name
      expect(result.controllers['TestEntityController']).toBeDefined();

      // Queries and handlers use the custom name
      expect(result.queries['CustomNameCrudListQuery']).toBeDefined();
      expect(result.queryHandlers['CustomName_list_Handler']).toBeDefined();
    });

    it('should support custom method names for operations', () => {
      const builder = new ConfigurableCrudBuilder<TestEntity>({
        controller: {
          path: 'test-entity',
          entity: 'TestEntity',
        },
        operations: [{ operation: Operation.List, methodName: 'findAll' }],
      });

      const result = builder.build();

      expect(result.queryHandlers['TestEntity_findAll_Handler']).toBeDefined();
      expect(result.queryHandlers['TestEntity_findAll_Handler'].name).toBe(
        'TestEntity_findAll_Handler',
      );
    });

    it('should generate all 9 operations', () => {
      const builder = new ConfigurableCrudBuilder<TestEntity>({
        controller: {
          path: 'test-entity',
          entity: 'TestEntity',
        },
        operations: [
          { operation: Operation.List },
          { operation: Operation.Read },
          { operation: Operation.Create },
          { operation: Operation.CreateBatch },
          { operation: Operation.Update },
          { operation: Operation.Replace },
          { operation: Operation.Delete },
          { operation: Operation.SoftDelete },
          { operation: Operation.Restore },
        ],
      });

      const result = builder.build();

      // All 9 handlers
      expect(result.providers.length).toBe(10); // 1 adapter + 9 handlers

      // Read operations → queries
      expect(result.queries['TestEntityCrudListQuery']).toBeDefined();
      expect(result.queries['TestEntityCrudReadQuery']).toBeDefined();

      // Write operations → commands
      expect(result.commands['TestEntityCrudCreateCommand']).toBeDefined();
      expect(result.commands['TestEntityCrudCreateBatchCommand']).toBeDefined();
      expect(result.commands['TestEntityCrudUpdateCommand']).toBeDefined();
      expect(result.commands['TestEntityCrudReplaceCommand']).toBeDefined();
      expect(result.commands['TestEntityCrudDeleteCommand']).toBeDefined();
      expect(result.commands['TestEntityCrudSoftDeleteCommand']).toBeDefined();
      expect(result.commands['TestEntityCrudRestoreCommand']).toBeDefined();
    });

    it('should use custom resolver when specified', () => {
      class CustomResolver implements CrudResolverInterface {
        static decorateQueryHandler = vi.fn();
        static decorateCommandHandler = vi.fn();
        list = vi.fn();
        read = vi.fn();
        create = vi.fn();
        createBatch = vi.fn();
        update = vi.fn();
        replace = vi.fn();
        delete = vi.fn();
        softDelete = vi.fn();
        restore = vi.fn();
      }

      const builder = new ConfigurableCrudBuilder<TestEntity>({
        controller: {
          path: 'test-entity',
          entity: 'TestEntity',

          resolver: CustomResolver,
        },
        operations: [{ operation: Operation.List }],
      });

      const result = builder.build();

      expect(result.controllers['TestEntityController']).toBeDefined();
    });
  });

  describe('build() - Path 3: Hybrid', () => {
    it('should augment existing methods and add new ones', () => {
      @CrudController({
        path: 'hybrid',
        entity: 'Hybrid',
      })
      class HybridController {
        constructor(
          @Inject(CrudAdapterResolver)
          protected readonly crudResolver: CrudResolverInterface,
        ) {}

        @CrudList()
        async list(@Ctx(CrudCtx) ctx: CrudContextInterface<TestEntity>) {
          return this.crudResolver.list(ctx);
        }
      }

      const builder = new ConfigurableCrudBuilder<TestEntity>({
        controller: { class: HybridController },
        operations: [
          // Augment existing method
          { operation: Operation.List },
          // Add new method
          { operation: Operation.Create },
        ],
      });

      const result = builder.build();

      expect(result.controllers['HybridController']).toBe(HybridController);
      expect(result.queryHandlers['Hybrid_list_Handler']).toBeDefined();
      expect(result.commandHandlers['Hybrid_create_Handler']).toBeDefined();
    });

    it('should throw when method exists with mismatched operation', () => {
      @CrudController({
        path: 'conflict',
        entity: 'Conflict',
      })
      class ConflictController {
        constructor(
          @Inject(CrudAdapterResolver)
          protected readonly crudResolver: CrudResolverInterface,
        ) {}

        @CrudList()
        async list(@Ctx(CrudCtx) ctx: CrudContextInterface<TestEntity>) {
          return this.crudResolver.list(ctx);
        }
      }

      const builder = new ConfigurableCrudBuilder<TestEntity>({
        controller: { class: ConflictController },
        operations: [
          // "list" method exists but is decorated with List, not Read
          { operation: Operation.Read, methodName: 'list' },
        ],
      });

      expect(() => builder.build()).toThrow(
        /Method "list" on ConflictController is decorated with operation "list" but operations array specifies "read"/,
      );
    });

    it('should throw when entity metadata is missing', () => {
      // Controller without @CrudController decorator → no entity metadata
      class BareController {
        async list() {
          return [];
        }
      }

      const builder = new ConfigurableCrudBuilder<TestEntity>({
        controller: { class: BareController },
        operations: [{ operation: Operation.List }],
      });

      expect(() => builder.build()).toThrow(CrudDecoratorException);
      expect(() => builder.build()).toThrow(
        'Controller BareController must have @CrudEntity or @CrudController with entity specified',
      );
    });
  });

  describe('setExtras()', () => {
    it('should apply options transform during build', () => {
      const builder = new ConfigurableCrudBuilder<TestEntity>({
        controller: {
          path: 'test-entity',
          entity: 'TestEntity',
        },
        operations: [{ operation: Operation.List }],
      });

      const transform: ConfigurableCrudOptionsTransformer<
        TestEntity,
        PlainLiteralObject
      > = vi.fn((options) => options);
      builder.setExtras({ customPath: 'custom' }, transform);

      const result = builder.build();

      expect(result.controllers['TestEntityController']).toBeDefined();
    });
  });

  describe('validateOperations()', () => {
    it('should throw on duplicate method names', () => {
      const builder = new ConfigurableCrudBuilder<TestEntity>({
        controller: {
          path: 'test-entity',
          entity: 'TestEntity',
        },
        operations: [
          { operation: Operation.List },
          { operation: Operation.List },
        ],
      });

      expect(() => builder.build()).toThrow(
        /Duplicate method name "list" in operations/,
      );
    });

    it('should throw on duplicate custom method names', () => {
      const builder = new ConfigurableCrudBuilder<TestEntity>({
        controller: {
          path: 'test-entity',
          entity: 'TestEntity',
        },
        operations: [
          { operation: Operation.List, methodName: 'findAll' },
          { operation: Operation.Read, methodName: 'findAll' },
        ],
      });

      expect(() => builder.build()).toThrow(
        /Duplicate method name "findAll" in operations/,
      );
    });

    it('should allow same operation with different method names', () => {
      const builder = new ConfigurableCrudBuilder<TestEntity>({
        controller: {
          path: 'test-entity',
          entity: 'TestEntity',
        },
        operations: [
          { operation: Operation.Delete, methodName: 'hardDelete' },
          { operation: Operation.Delete, methodName: 'removeOne' },
        ],
      });

      const result = builder.build();

      expect(
        result.commandHandlers['TestEntity_hardDelete_Handler'],
      ).toBeDefined();
      expect(
        result.commandHandlers['TestEntity_removeOne_Handler'],
      ).toBeDefined();
    });
  });

  describe('generated method implementations', () => {
    it('should generate working methods for all operation types', () => {
      const builder = new ConfigurableCrudBuilder<TestEntity>({
        controller: {
          path: 'test-entity',
          entity: 'TestEntity',
        },
        operations: [
          { operation: Operation.List },
          { operation: Operation.Read },
          { operation: Operation.Create },
          { operation: Operation.CreateBatch },
          { operation: Operation.Update },
          { operation: Operation.Replace },
          { operation: Operation.Delete },
          { operation: Operation.SoftDelete },
          { operation: Operation.Restore },
        ],
      });

      const result = builder.build();
      const ControllerClass = result.controllers['TestEntityController'];
      const proto = ControllerClass.prototype;

      // Verify all methods exist on the prototype
      expect(typeof proto.list).toBe('function');
      expect(typeof proto.read).toBe('function');
      expect(typeof proto.create).toBe('function');
      expect(typeof proto.createBatch).toBe('function');
      expect(typeof proto.update).toBe('function');
      expect(typeof proto.replace).toBe('function');
      expect(typeof proto.delete).toBe('function');
      expect(typeof proto.softDelete).toBe('function');
      expect(typeof proto.restore).toBe('function');
    });

    it('should delegate to crudResolver methods', async () => {
      const builder = new ConfigurableCrudBuilder<TestEntity>({
        controller: {
          path: 'test-entity',
          entity: 'TestEntity',
        },
        operations: [
          { operation: Operation.List },
          { operation: Operation.Read },
          { operation: Operation.Create },
          { operation: Operation.CreateBatch },
          { operation: Operation.Update },
          { operation: Operation.Replace },
          { operation: Operation.Delete },
          { operation: Operation.SoftDelete },
          { operation: Operation.Restore },
        ],
      });

      const result = builder.build();
      const ControllerClass = result.controllers['TestEntityController'];
      const proto = ControllerClass.prototype;

      const mockContext = {} as CrudContextInterface<TestEntity>;
      const mockDto = { id: '1', name: 'test' };
      const mockBatchDto = { bulk: [mockDto] };

      const mockResolver: CrudResolverInterface = {
        list: vi.fn().mockResolvedValue({ data: [] }),
        read: vi.fn().mockResolvedValue(mockDto),
        create: vi.fn().mockResolvedValue(mockDto),
        createBatch: vi.fn().mockResolvedValue([mockDto]),
        update: vi.fn().mockResolvedValue(mockDto),
        replace: vi.fn().mockResolvedValue(mockDto),
        delete: vi.fn().mockResolvedValue(null),
        softDelete: vi.fn().mockResolvedValue(null),
        restore: vi.fn().mockResolvedValue(null),
      };

      const instance = { crudResolver: mockResolver };

      // Call each generated method with the mock resolver as `this`
      await proto.list.call(instance, mockContext);
      expect(mockResolver.list).toHaveBeenCalledWith(mockContext);

      await proto.read.call(instance, mockContext);
      expect(mockResolver.read).toHaveBeenCalledWith(mockContext);

      await proto.create.call(instance, mockContext, mockDto);
      expect(mockResolver.create).toHaveBeenCalledWith(mockContext, mockDto);

      await proto.createBatch.call(instance, mockContext, mockBatchDto);
      expect(mockResolver.createBatch).toHaveBeenCalledWith(
        mockContext,
        mockBatchDto,
      );

      await proto.update.call(instance, mockContext, mockDto);
      expect(mockResolver.update).toHaveBeenCalledWith(mockContext, mockDto);

      await proto.replace.call(instance, mockContext, mockDto);
      expect(mockResolver.replace).toHaveBeenCalledWith(mockContext, mockDto);

      await proto.delete.call(instance, mockContext);
      expect(mockResolver.delete).toHaveBeenCalledWith(mockContext);

      await proto.softDelete.call(instance, mockContext);
      expect(mockResolver.softDelete).toHaveBeenCalledWith(mockContext);

      await proto.restore.call(instance, mockContext);
      expect(mockResolver.restore).toHaveBeenCalledWith(mockContext);
    });
  });
});
