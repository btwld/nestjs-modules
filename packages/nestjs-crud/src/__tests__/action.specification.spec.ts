import { ActionEnum, Operation } from '@concepta/nestjs-core';

import { ActionSpecification } from '../infrastructure/specifications/action.specification.js';
import { type CrudSpecContextInterface } from '../infrastructure/specifications/interfaces/crud-spec-context.interface.js';

function createContext(
  operation: Operation,
  action: ActionEnum,
): CrudSpecContextInterface {
  return { operation, action };
}

describe('ActionSpecification', () => {
  it('should match when action is in the list', () => {
    const spec = new ActionSpecification([
      ActionEnum.CREATE,
      ActionEnum.UPDATE,
    ]);

    expect(
      spec.isSatisfiedBy(createContext(Operation.Create, ActionEnum.CREATE)),
    ).toBe(true);
    expect(
      spec.isSatisfiedBy(createContext(Operation.Update, ActionEnum.UPDATE)),
    ).toBe(true);
  });

  it('should not match when action is not in the list', () => {
    const spec = new ActionSpecification([ActionEnum.CREATE]);

    expect(
      spec.isSatisfiedBy(createContext(Operation.Delete, ActionEnum.DELETE)),
    ).toBe(false);
  });
});
