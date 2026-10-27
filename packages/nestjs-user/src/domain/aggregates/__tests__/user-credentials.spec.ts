import { createTestEventContext } from '@concepta/nestjs-core/testing';

import { UserCredentialsMapper } from '../../../infrastructure/persistence/user-credentials.mapper.js';
import { type UserCredentialEntityInterface } from '../../interfaces/user-credential-entity.interface.js';
import { UserCredentials } from '../user-credentials.js';

const eventContext = createTestEventContext({}, {});
const mapper = new UserCredentialsMapper();

const mockEntity: UserCredentialEntityInterface = {
  id: 'cred-1',
  userId: 'user-1',
  passwordHash: 'hash',
  active: true,
  validFrom: new Date('2024-01-01'),
  validTo: null,
  dateCreated: new Date('2024-01-01'),
  dateUpdated: new Date('2024-01-01'),
  dateDeleted: null,
  version: 1,
};

describe(UserCredentials.name, () => {
  describe('create', () => {
    it('should create credentials with generated id', () => {
      const creds = UserCredentials.create(eventContext, {
        userId: 'user-1',
        passwordHash: 'hash',
      });

      expect(creds.id).toBeDefined();
      expect(creds.userId).toBe('user-1');
      expect(creds.passwordHash).toBe('hash');
      expect(creds.active).toBe(true);
      expect(creds.version).toBe(1);
      expect(creds.validFrom).toBeInstanceOf(Date);
      expect(creds.validTo).toBeNull();
      expect(creds.meta.dateCreated).toBeInstanceOf(Date);
      expect(creds.meta.dateUpdated).toBeInstanceOf(Date);
      expect(creds.meta.dateDeleted).toBeNull();
    });
  });

  describe('createWithId', () => {
    it('should use the provided id', () => {
      const creds = UserCredentials.createWithId(eventContext, 'custom-id', {
        userId: 'user-1',
        passwordHash: 'hash',
      });

      expect(creds.id).toBe('custom-id');
    });
  });

  describe('constructor', () => {
    it('should wrap entity with correct getters', () => {
      const creds = mapper.toDomain(mockEntity);

      expect(creds.id).toBe('cred-1');
      expect(creds.userId).toBe('user-1');
      expect(creds.passwordHash).toBe('hash');
      expect(creds.active).toBe(true);
      expect(creds.version).toBe(1);
    });
  });

  describe('toPlain', () => {
    it('should return a plain copy', () => {
      const creds = mapper.toDomain(mockEntity);
      const plain = creds.toPlain();

      expect(plain).toEqual(mockEntity);
      expect(plain).not.toBe(mockEntity);
    });
  });

  describe('deactivate', () => {
    it('should set active to false and increment version', () => {
      const creds = mapper.toDomain(mockEntity);

      creds.deactivate(eventContext);

      expect(creds.active).toBe(false);
      expect(creds.validTo).toBeInstanceOf(Date);
      expect(creds.version).toBe(2);
    });
  });
});
