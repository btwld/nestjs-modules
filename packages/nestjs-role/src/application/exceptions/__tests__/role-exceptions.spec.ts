import { HttpStatus } from '@nestjs/common';

import { RoleEntityNotFoundException } from '../../../infrastructure/exceptions/role-entity-not-found.exception.js';
import { RoleAssignmentConflictException } from '../role-assignment-conflict.exception.js';
import { RoleAssignmentNotFoundException } from '../role-assignment-not-found.exception.js';
import { RoleAssignmentsConflictException } from '../role-assignments-conflict.exception.js';
import { RoleNotFoundException } from '../role-not-found.exception.js';
import { RoleException } from '../role.exception.js';

describe('Role Exceptions', () => {
  describe(RoleException.name, () => {
    it('should have errorCode ROLE_ERROR', () => {
      const error = new RoleException();
      expect(error.errorCode).toBe('ROLE_ERROR');
    });

    it('should accept a custom message', () => {
      const error = new RoleException({
        message: 'Custom: %s',
        messageParams: ['test'],
      });
      expect(error.message).toBe('Custom: test');
    });
  });

  describe(RoleNotFoundException.name, () => {
    it('should have 404 status and correct context', () => {
      const error = new RoleNotFoundException({ id: 'role-123' });

      expect(error.errorCode).toBe('ROLE_NOT_FOUND_ERROR');
      expect(error.httpStatus).toBe(HttpStatus.NOT_FOUND);
      expect(error.context.id).toBe('role-123');
      expect(error.message).toContain('role-123');
    });

    it('should accept a custom message', () => {
      const error = new RoleNotFoundException({
        id: 'role-123',
        message: 'Gone: %s',
      });
      expect(error.message).toBe('Gone: role-123');
    });
  });

  describe(RoleAssignmentNotFoundException.name, () => {
    it('should have 404 status and correct context', () => {
      const error = new RoleAssignmentNotFoundException('assign-456');

      expect(error.errorCode).toBe('ROLE_ASSIGNMENT_NOT_FOUND_ERROR');
      expect(error.httpStatus).toBe(HttpStatus.NOT_FOUND);
      expect(error.context.assignmentId).toBe('assign-456');
      expect(error.message).toContain('assign-456');
    });
  });

  describe(RoleAssignmentConflictException.name, () => {
    it('should have 409 status and correct context', () => {
      const error = new RoleAssignmentConflictException('role-1', 'user-1');

      expect(error.errorCode).toBe('ROLE_ASSIGNMENT_CONFLICT_ERROR');
      expect(error.httpStatus).toBe(HttpStatus.CONFLICT);
      expect(error.context.roleId).toBe('role-1');
      expect(error.context.assigneeId).toBe('user-1');
      expect(error.message).toContain('role-1');
      expect(error.message).toContain('user-1');
    });
  });

  describe(RoleAssignmentsConflictException.name, () => {
    it('should have 409 status and correct context', () => {
      const error = new RoleAssignmentsConflictException('user-1');

      expect(error.errorCode).toBe('ROLE_ASSIGNMENTS_CONFLICT_ERROR');
      expect(error.httpStatus).toBe(HttpStatus.CONFLICT);
      expect(error.context.assigneeId).toBe('user-1');
      expect(error.message).toContain('user-1');
    });
  });

  describe(RoleEntityNotFoundException.name, () => {
    it('should have correct errorCode and context', () => {
      const error = new RoleEntityNotFoundException('UserRoleEntity');

      expect(error.errorCode).toBe('ROLE_ENTITY_NOT_FOUND_ERROR');
      expect(error.context.entityName).toBe('UserRoleEntity');
      expect(error.message).toContain('UserRoleEntity');
    });
  });
});
