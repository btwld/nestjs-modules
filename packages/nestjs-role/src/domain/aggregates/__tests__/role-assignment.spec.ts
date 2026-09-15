import {
  createMockEventContext,
  createMockRoleAssignmentEntity,
  toRoleAssignmentDomain,
} from '../../../__tests__/helpers/mock.helpers.js';
import { RoleAssignedEvent } from '../../events/role-assigned.event.js';
import { RoleRevokedEvent } from '../../events/role-revoked.event.js';
import { RoleAssignment } from '../role-assignment.js';

describe(RoleAssignment.name, () => {
  const eventContext = createMockEventContext();

  describe('create', () => {
    it('should return an instance with correct props', () => {
      const assignment = RoleAssignment.create(eventContext, {
        roleId: 'role-1',
        assigneeId: 'user-1',
      });

      expect(assignment.toPlain()).toEqual({
        id: expect.any(String),
        roleId: 'role-1',
        assigneeId: 'user-1',
        dateCreated: expect.any(Date),
        dateUpdated: expect.any(Date),
        dateDeleted: null,
        version: 1,
      });
    });

    it('should apply a RoleAssignedEvent', () => {
      const assignment = RoleAssignment.create(eventContext, {
        roleId: 'role-1',
        assigneeId: 'user-1',
      });

      const events = assignment.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(RoleAssignedEvent);
    });
  });

  describe('constructor', () => {
    it('should reconstitute from an entity without applying events', () => {
      const entity = createMockRoleAssignmentEntity();
      const assignment = toRoleAssignmentDomain(entity);

      expect(assignment.toPlain()).toEqual(entity);
      expect(assignment.getUncommittedEvents()).toHaveLength(0);
    });
  });

  describe('toPlain', () => {
    it('should return an immutable copy', () => {
      const entity = createMockRoleAssignmentEntity();
      const assignment = toRoleAssignmentDomain(entity);

      const plain = assignment.toPlain();
      plain.roleId = 'mutated';

      expect(assignment.roleId).toBe(entity.roleId);
    });
  });

  describe('revoke', () => {
    it('should apply a RoleRevokedEvent', () => {
      const assignment = toRoleAssignmentDomain(
        createMockRoleAssignmentEntity(),
      );

      assignment.revoke(eventContext);

      const events = assignment.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(RoleRevokedEvent);
    });
  });

  describe('immutability', () => {
    it('should not be affected by mutations to the original entity', () => {
      const entity = createMockRoleAssignmentEntity();
      const assignment = toRoleAssignmentDomain(entity);

      entity.roleId = 'mutated';

      expect(assignment.roleId).toBe('test-role-id');
    });
  });
});
