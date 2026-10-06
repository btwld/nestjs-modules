import { createTestEventContext } from '@concepta/nestjs-core/testing';

import { TokenIssuedEvent } from '../../events/token-issued.event.js';
import { TokenRevokedEvent } from '../../events/token-revoked.event.js';
import { TokenAlreadyRevokedException } from '../../exceptions/token-already-revoked.exception.js';
import { Token } from '../token.aggregate.js';

const eventContext = createTestEventContext({}, {});

const makeDto = (
  overrides: Partial<Parameters<typeof Token.create>[1]> = {},
) => ({
  sub: 'user-1',
  type: 'access' as const,
  exp: new Date(Date.now() + 3_600_000),
  ...overrides,
});

describe(Token.name, () => {
  describe('create', () => {
    it('should create a token with a generated UUID id', () => {
      const token = Token.create(eventContext, makeDto());
      expect(token.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('should default iat to current time when not supplied', () => {
      const before = new Date();
      const token = Token.create(eventContext, makeDto());
      const after = new Date();
      expect(token.iat.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(token.iat.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should use supplied iat', () => {
      const iat = new Date('2025-01-01T00:00:00.000Z');
      const token = Token.create(eventContext, makeDto({ iat }));
      expect(token.iat).toEqual(iat);
    });

    it('should default scope to empty array', () => {
      const token = Token.create(eventContext, makeDto());
      expect(token.scope).toEqual([]);
    });

    it('should apply TokenIssuedEvent', () => {
      const token = Token.create(eventContext, makeDto());
      const events = token.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(TokenIssuedEvent);
    });

    it('should include refreshedFrom on TokenIssuedEvent when supplied', () => {
      const prevId = 'prev-token-id';
      const token = Token.create(eventContext, makeDto(), prevId);
      const event = token.getUncommittedEvents()[0] as TokenIssuedEvent;
      expect(event.refreshedFrom).toBe(prevId);
    });

    it('should not include refreshedFrom when omitted', () => {
      const token = Token.create(eventContext, makeDto());
      const event = token.getUncommittedEvents()[0] as TokenIssuedEvent;
      expect(event.refreshedFrom).toBeUndefined();
    });
  });

  describe('createWithId', () => {
    it('should use the supplied id', () => {
      const token = Token.createWithId(eventContext, 'my-custom-id', makeDto());
      expect(token.id).toBe('my-custom-id');
    });
  });

  describe('isExpired', () => {
    it('should return false when exp is in the future', () => {
      const token = Token.create(
        eventContext,
        makeDto({ exp: new Date(Date.now() + 60_000) }),
      );
      expect(token.isExpired()).toBe(false);
    });

    it('should return true when exp is in the past', () => {
      const token = Token.create(
        eventContext,
        makeDto({ exp: new Date(Date.now() - 1) }),
      );
      expect(token.isExpired()).toBe(true);
    });

    it('should use the supplied now date', () => {
      const exp = new Date('2025-06-01T00:00:00.000Z');
      const token = Token.create(eventContext, makeDto({ exp }));
      expect(token.isExpired(new Date('2025-05-31T00:00:00.000Z'))).toBe(false);
      expect(token.isExpired(new Date('2025-06-01T00:00:00.000Z'))).toBe(true);
    });
  });

  describe('isRevoked', () => {
    it('should return false for a newly issued token', () => {
      const token = Token.create(eventContext, makeDto());
      expect(token.isRevoked()).toBe(false);
    });

    it('should return true after revoke()', () => {
      const token = Token.create(eventContext, makeDto());
      token.revoke(eventContext);
      expect(token.isRevoked()).toBe(true);
    });
  });

  describe('isActive', () => {
    it('should return true for a valid non-revoked token', () => {
      const token = Token.create(eventContext, makeDto());
      expect(token.isActive()).toBe(true);
    });

    it('should return false when expired', () => {
      const token = Token.create(
        eventContext,
        makeDto({ exp: new Date(Date.now() - 1) }),
      );
      expect(token.isActive()).toBe(false);
    });

    it('should return false when revoked', () => {
      const token = Token.create(eventContext, makeDto());
      token.revoke(eventContext);
      expect(token.isActive()).toBe(false);
    });
  });

  describe('revoke', () => {
    it('should apply TokenRevokedEvent', () => {
      const token = Token.create(eventContext, makeDto());
      token.revoke(eventContext);

      const events = token.getUncommittedEvents();
      const revokedEvents = events.filter(
        (e) => e instanceof TokenRevokedEvent,
      );
      expect(revokedEvents).toHaveLength(1);
    });

    it('should set revokedAt to the provided now date', () => {
      const now = new Date('2025-06-01T12:00:00.000Z');
      const token = Token.create(eventContext, makeDto());
      token.revoke(eventContext, now);
      expect(token.revokedAt).toEqual(now);
    });

    it('should throw TokenAlreadyRevokedException on double revoke', () => {
      const token = Token.create(eventContext, makeDto());
      token.revoke(eventContext);
      expect(() => token.revoke(eventContext)).toThrow(
        TokenAlreadyRevokedException,
      );
    });

    it('should not increment version', () => {
      const token = Token.create(eventContext, makeDto());
      const versionBefore = token.version;
      token.revoke(eventContext);
      expect(token.version).toBe(versionBefore);
    });
  });
});
