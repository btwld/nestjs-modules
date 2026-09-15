import { ActionEnum, Operation, Spec } from '@concepta/nestjs-core';

import { ActionSpecification } from '../infrastructure/specifications/action.specification.js';
import { CrudSpec } from '../infrastructure/specifications/crud-spec.factory.js';
import { type CrudSpecContextInterface } from '../infrastructure/specifications/interfaces/crud-spec-context.interface.js';
import { OperationSpecification } from '../infrastructure/specifications/operation.specification.js';

// ═══════════════════════════════════════════════════════════════════════════
// Test Context Factory
// ═══════════════════════════════════════════════════════════════════════════

function createContext(
  operation: Operation,
  action: ActionEnum,
): CrudSpecContextInterface {
  return { operation, action };
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('CrudSpec factory', () => {
  describe('inherited base specifications', () => {
    it('should expose Spec.always()', () => {
      const spec = CrudSpec.always();
      const ctx = createContext(Operation.List, ActionEnum.READ);

      expect(spec.isSatisfiedBy(ctx)).toBe(true);
    });

    it('should expose Spec.never()', () => {
      const spec = CrudSpec.never();
      const ctx = createContext(Operation.List, ActionEnum.READ);

      expect(spec.isSatisfiedBy(ctx)).toBe(false);
    });

    it('should expose Spec.and()', () => {
      const spec = CrudSpec.and(CrudSpec.always(), CrudSpec.never());
      const ctx = createContext(Operation.List, ActionEnum.READ);

      expect(spec.isSatisfiedBy(ctx)).toBe(false);
    });

    it('should expose Spec.or()', () => {
      const spec = CrudSpec.or(CrudSpec.always(), CrudSpec.never());
      const ctx = createContext(Operation.List, ActionEnum.READ);

      expect(spec.isSatisfiedBy(ctx)).toBe(true);
    });

    it('should expose Spec.not()', () => {
      const spec = CrudSpec.not(CrudSpec.never());
      const ctx = createContext(Operation.List, ActionEnum.READ);

      expect(spec.isSatisfiedBy(ctx)).toBe(true);
    });
  });

  describe('CrudSpec.operation()', () => {
    it('should match single operation', () => {
      const spec = CrudSpec.operation(Operation.Create);

      expect(
        spec.isSatisfiedBy(createContext(Operation.Create, ActionEnum.CREATE)),
      ).toBe(true);
      expect(
        spec.isSatisfiedBy(createContext(Operation.Update, ActionEnum.UPDATE)),
      ).toBe(false);
    });

    it('should match multiple operations', () => {
      const spec = CrudSpec.operation(Operation.Create, Operation.Update);

      expect(
        spec.isSatisfiedBy(createContext(Operation.Create, ActionEnum.CREATE)),
      ).toBe(true);
      expect(
        spec.isSatisfiedBy(createContext(Operation.Update, ActionEnum.UPDATE)),
      ).toBe(true);
      expect(
        spec.isSatisfiedBy(createContext(Operation.Delete, ActionEnum.DELETE)),
      ).toBe(false);
    });

    it('should return OperationSpecification instance', () => {
      const spec = CrudSpec.operation(Operation.Create);

      expect(spec).toBeInstanceOf(OperationSpecification);
    });
  });

  describe('CrudSpec.action()', () => {
    it('should match single action', () => {
      const spec = CrudSpec.action(ActionEnum.CREATE);

      expect(
        spec.isSatisfiedBy(createContext(Operation.Create, ActionEnum.CREATE)),
      ).toBe(true);
      expect(
        spec.isSatisfiedBy(createContext(Operation.List, ActionEnum.READ)),
      ).toBe(false);
    });

    it('should match multiple actions', () => {
      const spec = CrudSpec.action(ActionEnum.CREATE, ActionEnum.UPDATE);

      expect(
        spec.isSatisfiedBy(createContext(Operation.Create, ActionEnum.CREATE)),
      ).toBe(true);
      expect(
        spec.isSatisfiedBy(createContext(Operation.Update, ActionEnum.UPDATE)),
      ).toBe(true);
      expect(
        spec.isSatisfiedBy(createContext(Operation.Delete, ActionEnum.DELETE)),
      ).toBe(false);
    });

    it('should return ActionSpecification instance', () => {
      const spec = CrudSpec.action(ActionEnum.CREATE);

      expect(spec).toBeInstanceOf(ActionSpecification);
    });
  });

  describe('action shortcuts', () => {
    describe('CrudSpec.isCreate()', () => {
      it('should match CREATE action', () => {
        const spec = CrudSpec.isCreate();

        expect(
          spec.isSatisfiedBy(
            createContext(Operation.Create, ActionEnum.CREATE),
          ),
        ).toBe(true);
        expect(
          spec.isSatisfiedBy(
            createContext(Operation.CreateBatch, ActionEnum.CREATE),
          ),
        ).toBe(true);
        expect(
          spec.isSatisfiedBy(
            createContext(Operation.Update, ActionEnum.UPDATE),
          ),
        ).toBe(false);
      });
    });

    describe('CrudSpec.isRead()', () => {
      it('should match READ action', () => {
        const spec = CrudSpec.isRead();

        expect(
          spec.isSatisfiedBy(createContext(Operation.List, ActionEnum.READ)),
        ).toBe(true);
        expect(
          spec.isSatisfiedBy(createContext(Operation.Read, ActionEnum.READ)),
        ).toBe(true);
        expect(
          spec.isSatisfiedBy(
            createContext(Operation.Create, ActionEnum.CREATE),
          ),
        ).toBe(false);
      });
    });

    describe('CrudSpec.isUpdate()', () => {
      it('should match UPDATE action', () => {
        const spec = CrudSpec.isUpdate();

        expect(
          spec.isSatisfiedBy(
            createContext(Operation.Update, ActionEnum.UPDATE),
          ),
        ).toBe(true);
        expect(
          spec.isSatisfiedBy(
            createContext(Operation.Replace, ActionEnum.UPDATE),
          ),
        ).toBe(true);
        expect(
          spec.isSatisfiedBy(
            createContext(Operation.Create, ActionEnum.CREATE),
          ),
        ).toBe(false);
      });
    });

    describe('CrudSpec.isDelete()', () => {
      it('should match DELETE action for Delete operation', () => {
        const spec = CrudSpec.isDelete();

        expect(
          spec.isSatisfiedBy(
            createContext(Operation.Delete, ActionEnum.DELETE),
          ),
        ).toBe(true);
      });

      it('should match DELETE action for SoftDelete operation', () => {
        const spec = CrudSpec.isDelete();

        expect(
          spec.isSatisfiedBy(
            createContext(Operation.SoftDelete, ActionEnum.DELETE),
          ),
        ).toBe(true);
      });

      it('should not match non-DELETE actions', () => {
        const spec = CrudSpec.isDelete();

        expect(
          spec.isSatisfiedBy(
            createContext(Operation.Create, ActionEnum.CREATE),
          ),
        ).toBe(false);
      });
    });
  });

  describe('operation group shortcuts', () => {
    describe('CrudSpec.isQuery()', () => {
      it('should match List operation', () => {
        const spec = CrudSpec.isQuery();

        expect(
          spec.isSatisfiedBy(createContext(Operation.List, ActionEnum.READ)),
        ).toBe(true);
      });

      it('should match Read operation', () => {
        const spec = CrudSpec.isQuery();

        expect(
          spec.isSatisfiedBy(createContext(Operation.Read, ActionEnum.READ)),
        ).toBe(true);
      });

      it('should not match write operations', () => {
        const spec = CrudSpec.isQuery();

        expect(
          spec.isSatisfiedBy(
            createContext(Operation.Create, ActionEnum.CREATE),
          ),
        ).toBe(false);
        expect(
          spec.isSatisfiedBy(
            createContext(Operation.Update, ActionEnum.UPDATE),
          ),
        ).toBe(false);
        expect(
          spec.isSatisfiedBy(
            createContext(Operation.Delete, ActionEnum.DELETE),
          ),
        ).toBe(false);
      });
    });

    describe('CrudSpec.isWrite()', () => {
      it('should match Create operation', () => {
        const spec = CrudSpec.isWrite();

        expect(
          spec.isSatisfiedBy(
            createContext(Operation.Create, ActionEnum.CREATE),
          ),
        ).toBe(true);
      });

      it('should match CreateBatch operation', () => {
        const spec = CrudSpec.isWrite();

        expect(
          spec.isSatisfiedBy(
            createContext(Operation.CreateBatch, ActionEnum.CREATE),
          ),
        ).toBe(true);
      });

      it('should match Update operation', () => {
        const spec = CrudSpec.isWrite();

        expect(
          spec.isSatisfiedBy(
            createContext(Operation.Update, ActionEnum.UPDATE),
          ),
        ).toBe(true);
      });

      it('should match Replace operation', () => {
        const spec = CrudSpec.isWrite();

        expect(
          spec.isSatisfiedBy(
            createContext(Operation.Replace, ActionEnum.UPDATE),
          ),
        ).toBe(true);
      });

      it('should not match query operations', () => {
        const spec = CrudSpec.isWrite();

        expect(
          spec.isSatisfiedBy(createContext(Operation.List, ActionEnum.READ)),
        ).toBe(false);
        expect(
          spec.isSatisfiedBy(createContext(Operation.Read, ActionEnum.READ)),
        ).toBe(false);
      });

      it('should not match Delete operation', () => {
        const spec = CrudSpec.isWrite();

        expect(
          spec.isSatisfiedBy(
            createContext(Operation.Delete, ActionEnum.DELETE),
          ),
        ).toBe(false);
      });
    });

    describe('CrudSpec.isMutation()', () => {
      it('should match all write operations', () => {
        const spec = CrudSpec.isMutation();

        expect(
          spec.isSatisfiedBy(
            createContext(Operation.Create, ActionEnum.CREATE),
          ),
        ).toBe(true);
        expect(
          spec.isSatisfiedBy(
            createContext(Operation.CreateBatch, ActionEnum.CREATE),
          ),
        ).toBe(true);
        expect(
          spec.isSatisfiedBy(
            createContext(Operation.Update, ActionEnum.UPDATE),
          ),
        ).toBe(true);
        expect(
          spec.isSatisfiedBy(
            createContext(Operation.Replace, ActionEnum.UPDATE),
          ),
        ).toBe(true);
      });

      it('should match Delete operation', () => {
        const spec = CrudSpec.isMutation();

        expect(
          spec.isSatisfiedBy(
            createContext(Operation.Delete, ActionEnum.DELETE),
          ),
        ).toBe(true);
      });

      it('should match SoftDelete operation', () => {
        const spec = CrudSpec.isMutation();

        expect(
          spec.isSatisfiedBy(
            createContext(Operation.SoftDelete, ActionEnum.DELETE),
          ),
        ).toBe(true);
      });

      it('should match Restore operation', () => {
        const spec = CrudSpec.isMutation();

        expect(
          spec.isSatisfiedBy(
            createContext(Operation.Restore, ActionEnum.UPDATE),
          ),
        ).toBe(true);
      });

      it('should not match query operations', () => {
        const spec = CrudSpec.isMutation();

        expect(
          spec.isSatisfiedBy(createContext(Operation.List, ActionEnum.READ)),
        ).toBe(false);
        expect(
          spec.isSatisfiedBy(createContext(Operation.Read, ActionEnum.READ)),
        ).toBe(false);
      });
    });
  });

  describe('specification composition', () => {
    it('should compose with Spec.and()', () => {
      // Match CREATE action AND Create operation
      const spec = Spec.and(
        CrudSpec.isCreate(),
        CrudSpec.operation(Operation.Create),
      );

      expect(
        spec.isSatisfiedBy(createContext(Operation.Create, ActionEnum.CREATE)),
      ).toBe(true);
      expect(
        spec.isSatisfiedBy(
          createContext(Operation.CreateBatch, ActionEnum.CREATE),
        ),
      ).toBe(false);
    });

    it('should compose with Spec.or()', () => {
      // Match List OR Read operation
      const spec = Spec.or(
        CrudSpec.operation(Operation.List),
        CrudSpec.operation(Operation.Read),
      );

      expect(
        spec.isSatisfiedBy(createContext(Operation.List, ActionEnum.READ)),
      ).toBe(true);
      expect(
        spec.isSatisfiedBy(createContext(Operation.Read, ActionEnum.READ)),
      ).toBe(true);
      expect(
        spec.isSatisfiedBy(createContext(Operation.Create, ActionEnum.CREATE)),
      ).toBe(false);
    });

    it('should compose with Spec.not()', () => {
      // Match anything except query operations
      const spec = Spec.not(CrudSpec.isQuery());

      expect(
        spec.isSatisfiedBy(createContext(Operation.List, ActionEnum.READ)),
      ).toBe(false);
      expect(
        spec.isSatisfiedBy(createContext(Operation.Create, ActionEnum.CREATE)),
      ).toBe(true);
    });

    it('should handle complex nested compositions', () => {
      // (isMutation AND NOT isDelete) OR isQuery
      const spec = Spec.or(
        Spec.and(CrudSpec.isMutation(), Spec.not(CrudSpec.isDelete())),
        CrudSpec.isQuery(),
      );

      // Query operations match
      expect(
        spec.isSatisfiedBy(createContext(Operation.List, ActionEnum.READ)),
      ).toBe(true);
      expect(
        spec.isSatisfiedBy(createContext(Operation.Read, ActionEnum.READ)),
      ).toBe(true);

      // Mutation but not delete matches
      expect(
        spec.isSatisfiedBy(createContext(Operation.Create, ActionEnum.CREATE)),
      ).toBe(true);
      expect(
        spec.isSatisfiedBy(createContext(Operation.Update, ActionEnum.UPDATE)),
      ).toBe(true);

      // Delete does not match (mutation but excluded)
      expect(
        spec.isSatisfiedBy(createContext(Operation.Delete, ActionEnum.DELETE)),
      ).toBe(false);
    });
  });
});
