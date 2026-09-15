import { ActionEnum, Operation } from '@concepta/nestjs-core';

import { type CrudSpecContextInterface } from '../infrastructure/specifications/interfaces/crud-spec-context.interface.js';
import { OperationSpecification } from '../infrastructure/specifications/operation.specification.js';

function createContext(
  operation: Operation,
  action: ActionEnum,
): CrudSpecContextInterface {
  return { operation, action };
}

describe('OperationSpecification', () => {
  it('should match when operation is in the list', () => {
    const spec = new OperationSpecification([
      Operation.Create,
      Operation.Update,
    ]);

    expect(
      spec.isSatisfiedBy(createContext(Operation.Create, ActionEnum.CREATE)),
    ).toBe(true);
    expect(
      spec.isSatisfiedBy(createContext(Operation.Update, ActionEnum.UPDATE)),
    ).toBe(true);
  });

  it('should not match when operation is not in the list', () => {
    const spec = new OperationSpecification([Operation.Create]);

    expect(
      spec.isSatisfiedBy(createContext(Operation.Delete, ActionEnum.DELETE)),
    ).toBe(false);
  });
});
