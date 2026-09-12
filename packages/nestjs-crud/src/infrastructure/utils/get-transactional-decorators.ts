import {
  Transactional,
  type TransactionalOptions,
} from '@concepta/nestjs-repository';

/**
 * Resolve a transactional option into an array of method decorators.
 *
 * @param transactional - The transactional option from operation or route config.
 * @returns An array containing the `@Transactional()` decorator, or empty.
 */
export function getTransactionalDecorators(
  transactional?: boolean | TransactionalOptions,
): MethodDecorator[] {
  if (!transactional) {
    return [];
  }

  const options = typeof transactional === 'object' ? transactional : undefined;
  return [Transactional(options)];
}
