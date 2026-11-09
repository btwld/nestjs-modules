import {
  createMockEventContext,
  toCacheDomain,
} from '../../../__tests__/helpers/mock.helpers.js';
import { type CacheEntityInterface } from '../../../infrastructure/persistence/interfaces/cache-entity.interface.js';
import { type CacheCreatableInterface } from '../../interfaces/cache-creatable.interface.js';
import { CacheExpirationPolicy } from '../../policies/cache-expiration.policy.js';
import { Cache } from '../cache.js';

describe(Cache.name, () => {
  const eventContext = createMockEventContext();

  const policy = new CacheExpirationPolicy({ expiresIn: '1h' });

  const validCreateDto: CacheCreatableInterface = {
    key: 'testKey',
    type: 'testType',
    data: 'testData',
    assigneeId: 'testAssignee',
    expiresIn: null,
  };

  const mockEntity: CacheEntityInterface = {
    id: 'test-uuid',
    key: 'entityKey',
    type: 'entityType',
    assigneeId: 'entityAssignee',
    data: 'entityData',
    expirationDate: new Date('2026-12-31'),
    dateCreated: new Date('2026-01-01'),
    dateUpdated: new Date('2026-01-01'),
    dateDeleted: null,
    version: 1,
  };

  describe('constructor', () => {
    it('should hydrate all properties from entity', () => {
      const cache = toCacheDomain(mockEntity);

      expect(cache.id).toBe(mockEntity.id);
      expect(cache.key).toBe(mockEntity.key);
      expect(cache.type).toBe(mockEntity.type);
      expect(cache.assigneeId).toBe(mockEntity.assigneeId);
      expect(cache.data).toBe(mockEntity.data);
      expect(cache.expirationDate).toEqual(mockEntity.expirationDate);
      expect(cache.meta.dateCreated).toEqual(mockEntity.dateCreated);
      expect(cache.meta.dateUpdated).toEqual(mockEntity.dateUpdated);
      expect(cache.meta.dateDeleted).toBe(mockEntity.dateDeleted);
      expect(cache.version).toBe(mockEntity.version);
    });
  });

  describe('create', () => {
    it('should create a Cache with a computed expirationDate', () => {
      const expirationDate = policy.resolveExpirationDate(
        validCreateDto.expiresIn,
      );
      const cache = Cache.create(eventContext, validCreateDto, expirationDate);

      expect(cache).toBeInstanceOf(Cache);
      expect(cache.key).toBe('testKey');
      expect(cache.type).toBe('testType');
      expect(cache.data).toBe('testData');
      expect(cache.assigneeId).toBe('testAssignee');
      expect(cache.expirationDate).toBeInstanceOf(Date);
      expect(cache.version).toBe(1);
    });

    it('should use dto expiresIn when provided', () => {
      const dto: CacheCreatableInterface = {
        ...validCreateDto,
        expiresIn: '2d',
      };

      const expirationDate = policy.resolveExpirationDate(dto.expiresIn);
      const cache = Cache.create(eventContext, dto, expirationDate);

      expect(cache.expirationDate).toBeInstanceOf(Date);
    });

    it('should set expirationDate to null when passed null', () => {
      const cache = Cache.create(eventContext, validCreateDto, null);

      expect(cache.expirationDate).toBeNull();
    });

    it('should generate a uuid for id', () => {
      const expirationDate = policy.resolveExpirationDate(
        validCreateDto.expiresIn,
      );
      const cache = Cache.create(eventContext, validCreateDto, expirationDate);

      expect(cache.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });

  describe('toPlain', () => {
    it('should return a CacheEntityInterface snapshot', () => {
      const cache = toCacheDomain(mockEntity);
      const plain = cache.toPlain();

      expect(plain).toEqual(mockEntity);
    });

    it('should return a new object each time', () => {
      const cache = toCacheDomain(mockEntity);

      expect(cache.toPlain()).not.toBe(cache.toPlain());
    });
  });

  describe('updateData', () => {
    it('should update data and bump version', () => {
      const cache = toCacheDomain(mockEntity);

      cache.updateData(eventContext, 'newData');

      expect(cache.data).toBe('newData');
      expect(cache.version).toBe(mockEntity.version + 1);
    });

    it('should not change expirationDate', () => {
      const cache = toCacheDomain(mockEntity);
      const originalExpiration = cache.expirationDate;

      cache.updateData(eventContext, 'newData');

      expect(cache.expirationDate).toBe(originalExpiration);
    });
  });

  describe('extend', () => {
    it('should update expirationDate and bump version', () => {
      const cache = toCacheDomain(mockEntity);
      const newExpiration = policy.resolveExpirationDate('2h');

      cache.extend(eventContext, newExpiration);

      expect(cache.expirationDate).toBeInstanceOf(Date);
      expect(cache.version).toBe(mockEntity.version + 1);
    });

    it('should set expirationDate to null when passed null', () => {
      const cache = toCacheDomain(mockEntity);

      cache.extend(eventContext, null);

      expect(cache.expirationDate).toBeNull();
      expect(cache.version).toBe(mockEntity.version + 1);
    });
  });
});
