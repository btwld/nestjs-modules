import { createTestEventContext } from '@concepta/nestjs-core/testing';

import {
  createMockUserEntity,
  toUserDomain,
} from '../../../__tests__/helpers/mock.helpers.js';
import { User } from '../user.js';

const eventContext = createTestEventContext({}, {});
const mockEntity = createMockUserEntity();

describe(User.name, () => {
  describe('create', () => {
    it('should create a user with generated id', () => {
      const user = User.create(eventContext, {
        email: 'a@b.com',
        username: 'john',
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe('a@b.com');
      expect(user.username).toBe('john');
      expect(user.active).toBe(true);
      expect(user.version).toBe(1);
      expect(user.meta.dateCreated).toBeInstanceOf(Date);
      expect(user.meta.dateUpdated).toBeInstanceOf(Date);
      expect(user.meta.dateDeleted).toBeNull();
    });

    it('should default active to true', () => {
      const user = User.create(eventContext, {
        email: 'a@b.com',
        username: 'john',
      });

      expect(user.active).toBe(true);
    });

    it('should respect explicit active value', () => {
      const user = User.create(eventContext, {
        email: 'a@b.com',
        username: 'john',
        active: false,
      });

      expect(user.active).toBe(false);
    });
  });

  describe('createWithId', () => {
    it('should use the provided id', () => {
      const user = User.createWithId(eventContext, 'custom-id', {
        email: 'a@b.com',
        username: 'john',
      });

      expect(user.id).toBe('custom-id');
    });
  });

  describe('constructor', () => {
    it('should wrap entity with correct getters', () => {
      const user = toUserDomain(mockEntity);

      expect(user.id).toBe('user-1');
      expect(user.email).toBe('a@b.com');
      expect(user.username).toBe('john');
      expect(user.active).toBe(true);
      expect(user.version).toBe(1);
    });
  });

  describe('toPlain', () => {
    it('should return a plain copy', () => {
      const user = toUserDomain(mockEntity);
      const plain = user.toPlain();

      expect(plain).toEqual(mockEntity);
      expect(plain).not.toBe(mockEntity);
    });
  });

  describe('update', () => {
    it('should merge dto and increment version', () => {
      const user = toUserDomain(mockEntity);
      const beforeUpdate = user.meta.dateUpdated;

      user.update(eventContext, { active: false });

      expect(user.active).toBe(false);
      expect(user.version).toBe(2);
      expect(user.meta.dateUpdated.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime(),
      );
    });

    it('should preserve unchanged fields', () => {
      const user = toUserDomain(mockEntity);

      user.update(eventContext, { active: false });

      expect(user.email).toBe('a@b.com');
      expect(user.username).toBe('john');
    });
  });

  describe('remove', () => {
    it('should not throw', () => {
      const user = toUserDomain(mockEntity);

      expect(() => user.remove(eventContext)).not.toThrow();
    });
  });
});
