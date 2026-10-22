import { CrudDecoratorException } from '../../exceptions/crud-decorator.exception.js';
import { CrudMetadataLookupTarget } from '../../services/crud-metadata.service.js';

/**
 * A decorator function that can be applied to methods, classes, or parameters.
 */
export type UniversalDecorator = (
  target: object,
  propertyKey?: string | symbol,
  descriptorOrIndex?: PropertyDescriptor | number,
) => void;

/**
 * Decorator that asserts the target type matches the expected lookup target.
 */
export function applyAssertTarget(
  lookupTarget: CrudMetadataLookupTarget,
): UniversalDecorator {
  return (
    target: object,
    propertyKey?: string | symbol,
    descriptorOrIndex?: PropertyDescriptor | number,
  ) => {
    const targetName =
      typeof target === 'function' ? target.name : target.constructor.name;
    const location = propertyKey
      ? `${targetName}.${String(propertyKey)}`
      : targetName;

    switch (lookupTarget) {
      case CrudMetadataLookupTarget.Class:
        if (!(typeof target === 'function' && propertyKey === undefined)) {
          throw new CrudDecoratorException({
            message: `Decorator can only be applied to classes, but was applied at ${location}`,
          });
        }
        break;

      case CrudMetadataLookupTarget.Method:
        if (typeof target === 'function' && propertyKey === undefined) {
          throw new CrudDecoratorException({
            message: `Decorator can only be applied to methods, but was applied to class ${targetName}`,
          });
        }
        if (typeof descriptorOrIndex === 'number') {
          throw new CrudDecoratorException({
            message: `Decorator can only be applied to methods, but was applied to parameter ${descriptorOrIndex} at ${location}`,
          });
        }
        break;

      case CrudMetadataLookupTarget.Parameter: {
        // Parameter decorators can be applied in two contexts:
        // 1. By user: (target, propertyKey, parameterIndex) - parameterIndex is a number
        // 2. Internally for metadata storage: (handler) - target is function, no propertyKey
        const isParameterContext = typeof descriptorOrIndex === 'number';
        const isInternalStorage =
          typeof target === 'function' && propertyKey === undefined;
        if (!isParameterContext && !isInternalStorage) {
          throw new CrudDecoratorException({
            message: `Decorator can only be applied to parameters, but was applied at ${location}`,
          });
        }
        break;
      }

      case CrudMetadataLookupTarget.MethodAndClass:
        if (typeof descriptorOrIndex === 'number') {
          throw new CrudDecoratorException({
            message: `Decorator can only be applied to methods or classes, but was applied to parameter ${descriptorOrIndex} at ${location}`,
          });
        }
        break;
    }
  };
}
