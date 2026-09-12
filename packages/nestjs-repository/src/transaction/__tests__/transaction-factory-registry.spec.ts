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
});
