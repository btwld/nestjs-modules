import { type TransactionFactoryInterface } from '../../interfaces/transaction-factory.interface.js';
import { type TransactionInterface } from '../interfaces/transaction.interface.js';
import { TransactionFactoryRegistry } from '../transaction-factory-registry.js';

describe(TransactionFactoryRegistry.name, () => {
  let registry: TransactionFactoryRegistry;
  let mockFactory: TransactionFactoryInterface;
  let mockTransaction: TransactionInterface;

  beforeEach(() => {
    registry = new TransactionFactoryRegistry();

    mockTransaction = {
      isActive: false,
      start: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      getClient: vi.fn(),
    };

    mockFactory = {
      create: vi.fn().mockReturnValue(mockTransaction),
    };
  });

  describe('register', () => {
    it('should register a factory', () => {
      registry.register('typeorm:default', mockFactory);
      expect(registry.get('typeorm:default')).toBe(mockFactory);
    });

    it('should skip if key already exists', () => {
      const secondFactory: TransactionFactoryInterface = {
        create: vi.fn(),
      };

      registry.register('typeorm:default', mockFactory);
      registry.register('typeorm:default', secondFactory);

      // Should still have the first factory
      const retrieved = registry.get('typeorm:default');
      expect(retrieved).toBe(mockFactory);
    });
  });

  describe('get', () => {
    it('should return factory for key', () => {
      registry.register('typeorm:default', mockFactory);
      const retrieved = registry.get('typeorm:default');
      expect(retrieved).toBe(mockFactory);
    });

    it('should return undefined for unknown key', () => {
      const retrieved = registry.get('unknown:key');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('queueFor', () => {
    it('should return undefined when no factory is registered for the key', () => {
      expect(registry.queueFor('unknown:key')).toBeUndefined();
    });

    it('should return undefined when the factory omits supportsConcurrentTransactions', () => {
      registry.register('typeorm:default', mockFactory);
      expect(registry.queueFor('typeorm:default')).toBeUndefined();
    });

    it('should return undefined when the factory declares supportsConcurrentTransactions: true', () => {
      registry.register('typeorm:default', {
        ...mockFactory,
        supportsConcurrentTransactions: true,
      });
      expect(registry.queueFor('typeorm:default')).toBeUndefined();
    });

    it('should return a queue when the factory declares supportsConcurrentTransactions: false', () => {
      registry.register('sqlite:default', {
        ...mockFactory,
        supportsConcurrentTransactions: false,
      });
      expect(registry.queueFor('sqlite:default')).toBeDefined();
    });

    it('should return the same queue instance for the same key on repeated calls', () => {
      registry.register('sqlite:default', {
        ...mockFactory,
        supportsConcurrentTransactions: false,
      });
      const first = registry.queueFor('sqlite:default');
      const second = registry.queueFor('sqlite:default');
      expect(first).toBe(second);
    });

    it('should return separate queues for separate single-connection keys', () => {
      registry.register('sqlite:default', {
        ...mockFactory,
        supportsConcurrentTransactions: false,
      });
      registry.register('sqlite:secondary', {
        ...mockFactory,
        supportsConcurrentTransactions: false,
      });

      expect(registry.queueFor('sqlite:default')).not.toBe(
        registry.queueFor('sqlite:secondary'),
      );
    });
  });
});
