import { createTestEventContext } from '@concepta/nestjs-core/testing';

import { InvitationAlreadyAcceptedException } from '../../exceptions/invitation-already-accepted.exception.js';
import { InvitationRevokedException } from '../../exceptions/invitation-revoked.exception.js';
import { type InvitationCreatableInterface } from '../../interfaces/invitation-creatable.interface.js';
import { Invitation } from '../invitation.js';

describe(Invitation.name, () => {
  const eventContext = createTestEventContext({}, {});

  const validCreateDto: InvitationCreatableInterface = {
    code: 'test-code',
    category: 'user',
    userId: 'test-user-id',
    constraints: { role: 'admin' },
  };

  describe('constructor', () => {
    it('should set all properties from constructor args', () => {
      const invitation = new Invitation(
        'test-id',
        {
          code: 'abc',
          category: 'user',
          userId: 'user-1',
          constraints: undefined,
          dateAccepted: null,
          dateRevoked: null,
        },
        2,
        {
          dateCreated: new Date('2026-01-01'),
          dateUpdated: new Date('2026-01-01'),
          dateDeleted: null,
        },
      );

      expect(invitation.id).toBe('test-id');
      expect(invitation.code).toBe('abc');
      expect(invitation.category).toBe('user');
      expect(invitation.userId).toBe('user-1');
      expect(invitation.active).toBe(true);
      expect(invitation.isAccepted).toBe(false);
      expect(invitation.isRevoked).toBe(false);
      expect(invitation.dateAccepted).toBeNull();
      expect(invitation.dateRevoked).toBeNull();
      expect(invitation.constraints).toBeUndefined();
      expect(invitation.version).toBe(2);
      expect(invitation.meta.dateCreated).toEqual(new Date('2026-01-01'));
      expect(invitation.meta.dateUpdated).toEqual(new Date('2026-01-01'));
      expect(invitation.meta.dateDeleted).toBeNull();
    });
  });

  describe('create', () => {
    it('should create an Invitation with active=true and null dates', () => {
      const invitation = Invitation.create(eventContext, validCreateDto);

      expect(invitation).toBeInstanceOf(Invitation);
      expect(invitation.code).toBe('test-code');
      expect(invitation.category).toBe('user');
      expect(invitation.userId).toBe('test-user-id');
      expect(invitation.active).toBe(true);
      expect(invitation.isAccepted).toBe(false);
      expect(invitation.isRevoked).toBe(false);
      expect(invitation.dateAccepted).toBeNull();
      expect(invitation.dateRevoked).toBeNull();
      expect(invitation.constraints).toEqual({ role: 'admin' });
      expect(invitation.version).toBe(1);
    });

    it('should generate a uuid for id', () => {
      const invitation = Invitation.create(eventContext, validCreateDto);

      expect(invitation.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('should default constraints to undefined when not provided', () => {
      const dto: InvitationCreatableInterface = {
        code: 'test-code',
        category: 'user',
        userId: 'test-user-id',
      };

      const invitation = Invitation.create(eventContext, dto);

      expect(invitation.constraints).toBeUndefined();
    });
  });

  describe('createWithId', () => {
    it('should use the provided id', () => {
      const invitation = Invitation.createWithId(
        eventContext,
        'custom-id',
        validCreateDto,
      );

      expect(invitation.id).toBe('custom-id');
    });
  });

  describe('accept', () => {
    it('should set dateAccepted and mark as accepted', () => {
      const invitation = Invitation.create(eventContext, validCreateDto);

      invitation.accept(eventContext);

      expect(invitation.isAccepted).toBe(true);
      expect(invitation.active).toBe(false);
      expect(invitation.dateAccepted).toBeInstanceOf(Date);
    });

    it('should throw InvitationAlreadyAcceptedException if already accepted', () => {
      const invitation = Invitation.create(eventContext, validCreateDto);
      invitation.accept(eventContext);

      expect(() => invitation.accept(eventContext)).toThrow(
        InvitationAlreadyAcceptedException,
      );
    });

    it('should throw InvitationRevokedException if revoked', () => {
      const invitation = Invitation.create(eventContext, validCreateDto);
      invitation.revoke(eventContext);

      expect(() => invitation.accept(eventContext)).toThrow(
        InvitationRevokedException,
      );
    });
  });

  describe('dispatch', () => {
    it('should not change any state', () => {
      const invitation = Invitation.create(eventContext, validCreateDto);

      const dispatchContext = createTestEventContext(
        {},
        { passcode: 'abc', tokenExp: new Date() },
      );

      invitation.dispatch(dispatchContext);

      expect(invitation.active).toBe(true);
      expect(invitation.isAccepted).toBe(false);
      expect(invitation.isRevoked).toBe(false);
    });
  });

  describe('revoke', () => {
    it('should set dateRevoked and mark as revoked', () => {
      const invitation = Invitation.create(eventContext, validCreateDto);

      invitation.revoke(eventContext);

      expect(invitation.isRevoked).toBe(true);
      expect(invitation.active).toBe(false);
      expect(invitation.dateRevoked).toBeInstanceOf(Date);
    });

    it('should be idempotent if already revoked', () => {
      const invitation = Invitation.create(eventContext, validCreateDto);
      invitation.revoke(eventContext);

      const dateRevoked = invitation.dateRevoked;

      invitation.revoke(eventContext);

      expect(invitation.dateRevoked).toBe(dateRevoked);
    });

    it('should throw InvitationAlreadyAcceptedException if accepted', () => {
      const invitation = Invitation.create(eventContext, validCreateDto);
      invitation.accept(eventContext);

      expect(() => invitation.revoke(eventContext)).toThrow(
        InvitationAlreadyAcceptedException,
      );
    });
  });

  describe('toPlain', () => {
    it('should return a snapshot with id, version, props, and meta', () => {
      const invitation = new Invitation(
        'test-id',
        {
          code: 'abc',
          category: 'user',
          userId: 'user-1',
          constraints: undefined,
          dateAccepted: null,
          dateRevoked: null,
        },
        1,
        {
          dateCreated: new Date('2026-01-01'),
          dateUpdated: new Date('2026-01-01'),
          dateDeleted: null,
        },
      );

      const plain = invitation.toPlain();

      expect(plain).toEqual({
        id: 'test-id',
        version: 1,
        code: 'abc',
        category: 'user',
        userId: 'user-1',
        constraints: undefined,
        dateAccepted: null,
        dateRevoked: null,
        dateCreated: new Date('2026-01-01'),
        dateUpdated: new Date('2026-01-01'),
        dateDeleted: null,
      });
    });

    it('should return a new object each time', () => {
      const invitation = Invitation.create(eventContext, validCreateDto);

      expect(invitation.toPlain()).not.toBe(invitation.toPlain());
    });
  });
});
