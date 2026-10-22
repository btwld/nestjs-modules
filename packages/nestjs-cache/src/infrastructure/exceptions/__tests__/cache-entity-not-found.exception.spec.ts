import { CacheEntityNotFoundException } from '../cache-entity-not-found.exception.js';

describe(CacheEntityNotFoundException.name, () => {
  it('should create an instance of EntityNotFoundException', () => {
    const exception = new CacheEntityNotFoundException('TestEntity');
    expect(exception).toBeInstanceOf(CacheEntityNotFoundException);
  });

  it('should have the correct error message', () => {
    const exception = new CacheEntityNotFoundException('TestEntity');
    expect(exception.message).toBe(
      'Entity TestEntity was not registered to be used.',
    );
  });

  it('should have the correct context', () => {
    const exception = new CacheEntityNotFoundException('TestEntity');
    expect(exception.context).toEqual({ entityName: 'TestEntity' });
  });

  it('should have the correct error code', () => {
    const exception = new CacheEntityNotFoundException('TestEntity');
    expect(exception.errorCode).toBe('CACHE_ENTITY_NOT_FOUND_ERROR');
  });
});
