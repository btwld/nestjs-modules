import { Injectable } from '@nestjs/common';

import { type AttackUserInterface } from './attack-user.interface.js';

/** The users the application starts with. */
export const ATTACK_USERS: readonly AttackUserInterface[] = [
  user('alice', ['clerk'], 'acme'),
  user('grace', ['manager'], 'acme'),
  user('sam', ['supervisor'], 'acme'),
  user('jun', ['junior'], 'acme'),
  user('ivy', ['intake'], 'acme'),
  user('carl', ['collector'], 'acme'),
  user('rita', ['redactor'], 'acme'),
  user('cora', ['corrector'], 'acme'),
  user('bill', ['biller'], 'acme'),
  user('mallory', ['clerk'], 'globex'),
  user('gus', ['manager'], 'globex'),
  { ...user('ian', ['clerk'], 'acme'), active: false },
];

function user(
  id: string,
  roles: readonly string[],
  tenantId: string,
): AttackUserInterface {
  return {
    id,
    email: `${id}@example.com`,
    username: id,
    active: true,
    roles,
    tenantId,
  };
}

/** An in-memory user table, which a test may change between calls. */
@Injectable()
export class AttackUserStore {
  private users = new Map<string, AttackUserInterface>(
    ATTACK_USERS.map((entry) => [entry.id, entry]),
  );

  byId(id: string): AttackUserInterface | null {
    return this.users.get(id) ?? null;
  }

  find(
    match: (entry: AttackUserInterface) => boolean,
  ): AttackUserInterface | null {
    return [...this.users.values()].find(match) ?? null;
  }

  update(id: string, changes: Partial<AttackUserInterface>): void {
    const existing = this.users.get(id);
    if (existing) {
      this.users = new Map(this.users).set(id, { ...existing, ...changes });
    }
  }

  remove(id: string): void {
    const next = new Map(this.users);
    next.delete(id);
    this.users = next;
  }
}
