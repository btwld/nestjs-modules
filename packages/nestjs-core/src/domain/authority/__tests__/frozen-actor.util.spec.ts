import { type Actor } from '../interfaces/actor.type.js';
import { frozenActor } from '../utils/frozen-actor.util.js';

describe(frozenActor.name, () => {
  it('should copy a role actor with roles that cannot change', () => {
    const roles = ['clerk'];
    const actor: Actor = { kind: 'role', roles, userId: 'user-1' };

    const frozen = frozenActor(actor);
    roles.push('admin');

    expect(frozen).toEqual({
      kind: 'role',
      roles: ['clerk'],
      userId: 'user-1',
    });
    expect(frozen.kind === 'role' && Object.isFrozen(frozen.roles)).toBe(true);
  });

  it('should copy a system actor', () => {
    const actor: Actor = { kind: 'system', name: 'billing' };

    expect(frozenActor(actor)).toEqual(actor);
    expect(frozenActor(actor)).not.toBe(actor);
  });
});
