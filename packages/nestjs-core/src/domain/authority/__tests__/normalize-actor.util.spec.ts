import { type Actor } from '../interfaces/actor.type.js';
import { type RoleActorInterface } from '../interfaces/role-actor.interface.js';
import { type SystemActorInterface } from '../interfaces/system-actor.interface.js';
import { normalizeActor } from '../utils/normalize-actor.util.js';

describe(normalizeActor.name, () => {
  it('should keep only the kind, roles and userId of a role actor', () => {
    const actor: RoleActorInterface & { email: string } = {
      kind: 'role',
      roles: ['clerk'],
      userId: 'user-1',
      email: 'clerk@example.com',
    };

    expect(normalizeActor(actor)).toEqual({
      kind: 'role',
      roles: ['clerk'],
      userId: 'user-1',
    });
  });

  it('should leave out a role actor userId that is not set', () => {
    const actor: Actor = { kind: 'role', roles: ['clerk'], userId: undefined };

    const normalized = normalizeActor(actor);

    expect(normalized).toEqual({ kind: 'role', roles: ['clerk'] });
    expect(Object.keys(normalized)).toEqual(['kind', 'roles']);
  });

  it('should copy the roles', () => {
    const roles = ['clerk'];
    const actor: Actor = { kind: 'role', roles };

    const normalized = normalizeActor(actor);
    roles.push('admin');

    expect(normalized).toEqual({ kind: 'role', roles: ['clerk'] });
    expect(normalized.kind === 'role' && normalized.roles).not.toBe(roles);
  });

  it('should keep only the kind and name of a system actor', () => {
    const actor: SystemActorInterface & { host: string } = {
      kind: 'system',
      name: 'billing',
      host: 'worker-1',
    };

    const normalized = normalizeActor(actor);

    expect(normalized).toEqual({ kind: 'system', name: 'billing' });
    expect(normalized).not.toBe(actor);
  });
});
