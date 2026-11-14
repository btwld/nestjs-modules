import { actorKeys } from '@concepta/nestjs-core';

import { accessGrantsProblems } from '../access-rule-problems.util.js';

describe(accessGrantsProblems.name, () => {
  it('accepts grants keyed by role and system actors', () => {
    expect(
      accessGrantsProblems({
        'role:admin': [
          { action: 'read', subject: 'user' },
          { action: ['update', 'approve'], subject: ['user', 'org'] },
        ],
        'system:agile': [{ action: 'read', subject: 'user' }],
      }),
    ).toEqual([]);
  });

  it('refuses a key that names no actor kind, and each unusable rule set', () => {
    expect(
      accessGrantsProblems({
        admin: [{ action: 'read', subject: 'user' }],
        'role:clerk': [{ action: 'read:any', subject: 'user' }],
        'system:agile': [{ action: 'read', subject: 'user' }],
      }),
    ).toEqual([
      'grants key "admin": must be role:<name> or system:<name>',
      'role:clerk rule 0: action "read:any" must be a verb, such as read or approve',
    ]);
  });

  it('refuses a key with anything before the actor kind, or a name a space starts or ends', () => {
    expect(
      accessGrantsProblems({
        'xrole:clerk': [],
        'role: clerk': [],
        'role:clerk ': [],
      }),
    ).toEqual([
      'grants key "xrole:clerk": must be role:<name> or system:<name>',
      'grants key "role: clerk": must be role:<name> or system:<name>',
      'grants key "role:clerk ": must be role:<name> or system:<name>',
    ]);
  });

  it('accepts a role named with a space, as actorKeys keys it', () => {
    expect(
      accessGrantsProblems({
        [actorKeys({ kind: 'role', roles: ['head clerk'] })[0] ?? '']: [],
      }),
    ).toEqual([]);
  });
});
