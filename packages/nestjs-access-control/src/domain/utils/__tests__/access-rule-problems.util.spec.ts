import { type AccessRuleInterface } from '../../interfaces/access-rule.interface.js';
import {
  accessGrantsProblems,
  accessRuleProblems,
} from '../access-rule-problems.util.js';

describe(accessRuleProblems.name, () => {
  it('accepts a valid rule set', () => {
    expect(
      accessRuleProblems(
        [
          { action: 'read:any', subject: 'user' },
          { action: ['update:own', 'approve:any'], subject: ['user', 'org'] },
          {
            action: 'read:any',
            subject: 'user',
            fields: ['password'],
            inverted: true,
            reason: 'secret',
          },
          {
            action: 'read:any',
            subject: 'user',
            fields: ['v2', '2fa.code'],
          },
        ],
        'role:admin',
      ),
    ).toEqual([]);
  });

  it.each<[string, AccessRuleInterface, string]>([
    [
      'an action without possession',
      { action: 'read', subject: 'user' },
      'action "read" must be <action>:<any|own>',
    ],
    [
      'an unknown possession',
      { action: 'read:mine', subject: 'user' },
      'action "read:mine" must be <action>:<any|own>',
    ],
    [
      'a possession followed by more',
      { action: 'read:anything', subject: 'user' },
      'action "read:anything" must be <action>:<any|own>',
    ],
    [
      'an action of more than one part',
      { action: 'a:read:any', subject: 'user' },
      'action "a:read:any" must be <action>:<any|own>',
    ],
    [
      'the manage wildcard',
      { action: 'manage:any', subject: 'user' },
      'action "manage:any" is reserved',
    ],
    [
      'the all wildcard',
      { action: 'read:any', subject: 'all' },
      'subject "all" is reserved',
    ],
    [
      'an empty fields list',
      { action: 'read:any', subject: 'user', fields: [] },
      'fields is empty; leave it out to cover every field',
    ],
    [
      'a blank field',
      { action: 'read:any', subject: 'user', fields: [' '] },
      'fields has a blank entry',
    ],
    [
      'a blank field among named ones',
      { action: 'read:any', subject: 'user', fields: ['name', ''] },
      'fields has a blank entry',
    ],
    [
      'a field naming an array position',
      { action: 'read:any', subject: 'user', fields: ['items.0.secret'] },
      'fields name array positions or numeric keys, which paths are checked without; name the field beneath them',
    ],
    [
      'an array position among named fields',
      { action: 'read:any', subject: 'user', fields: ['name', 'items.0'] },
      'fields name array positions or numeric keys, which paths are checked without; name the field beneath them',
    ],
    [
      'a field pattern',
      { action: 'read:any', subject: 'user', fields: ['name', 'profile.*'] },
      'fields name patterns, which are not supported; a field covers everything beneath it',
    ],
    [
      'a deep field pattern',
      { action: 'read:any', subject: 'user', fields: ['**.secret'] },
      'fields name patterns, which are not supported; a field covers everything beneath it',
    ],
    [
      'a blank subject',
      { action: 'read:any', subject: '' },
      'subject is blank',
    ],
    [
      'an empty action list',
      { action: [], subject: 'user' },
      'action must be a string or a non-empty list of strings',
    ],
  ])('refuses %s', (_label, rule, problem) => {
    expect(accessRuleProblems([rule], 'role:admin')).toEqual([
      `role:admin rule 0: ${problem}`,
    ]);
  });

  // Stored rules arrive as parsed JSON, whatever their shape.
  it('refuses conditions, naming row scope', () => {
    expect(
      accessRuleProblems(
        JSON.parse(
          '[{"action":"read:any","subject":"user","conditions":{"ownerId":1}}]',
        ),
        'grants provider',
      ),
    ).toEqual([
      'grants provider rule 0: conditions are not supported; which rows a caller reaches is row scope',
    ]);
  });

  it('refuses stored rules of the wrong types without throwing', () => {
    expect(
      accessRuleProblems(
        JSON.parse(
          '[null, {"action":1,"subject":["user",2],"fields":"name","inverted":"yes","reason":3,"extra":true}]',
        ),
        'grants provider',
      ),
    ).toEqual([
      'grants provider rule 0: must be an object',
      'grants provider rule 1: unknown property "extra"',
      'grants provider rule 1: action must be a string or a non-empty list of strings',
      'grants provider rule 1: subject must be a string or a non-empty list of strings',
      'grants provider rule 1: fields must be a list of strings',
      'grants provider rule 1: inverted must be a boolean',
      'grants provider rule 1: reason must be a string',
    ]);
  });

  it('refuses rules that are not a list', () => {
    expect(accessRuleProblems(JSON.parse('{}'), 'grants provider')).toEqual([
      'grants provider: rules must be an array',
    ]);
  });
});

describe(accessGrantsProblems.name, () => {
  it('refuses a key that names no actor kind, and each unusable rule set', () => {
    expect(
      accessGrantsProblems({
        admin: [{ action: 'read:any', subject: 'user' }],
        'role:clerk': [{ action: 'read', subject: 'user' }],
        'system:agile': [{ action: 'read:any', subject: 'user' }],
      }),
    ).toEqual([
      'grants key "admin": must be role:<name> or system:<name>',
      'role:clerk rule 0: action "read" must be <action>:<any|own>',
    ]);
  });

  it('refuses a key with anything before the actor kind or a space in the name', () => {
    expect(
      accessGrantsProblems({
        'xrole:clerk': [],
        'role:head clerk': [],
      }),
    ).toEqual([
      'grants key "xrole:clerk": must be role:<name> or system:<name>',
      'grants key "role:head clerk": must be role:<name> or system:<name>',
    ]);
  });
});
