import { type AccessGrants } from '../interfaces/access-grants.type.js';
import { type AccessRuleInterface } from '../interfaces/access-rule.interface.js';

const RULE_KEYS = new Set([
  'action',
  'subject',
  'fields',
  'inverted',
  'reason',
]);
const ACTION_PATTERN = /^([^\s:]+):(any|own)$/;
const ACTOR_KEY_PATTERN = /^(role|system):\S+$/;

// CASL treats these as wildcards: a rule on either would reach everything.
const RESERVED_ACTION = 'manage';
const RESERVED_SUBJECT = 'all';

/**
 * A string or list of strings as a list, or `undefined` when it is neither.
 */
function toStrings(value: unknown): string[] | undefined {
  const list: unknown[] = Array.isArray(value) ? value : [value];

  return list.every((item): item is string => typeof item === 'string')
    ? list
    : undefined;
}

function problemsOf(rule: unknown): string[] {
  if (typeof rule !== 'object' || rule === null || Array.isArray(rule)) {
    return ['must be an object'];
  }

  const problems = Object.keys(rule)
    .filter((key) => !RULE_KEYS.has(key))
    .map((key) =>
      key === 'conditions'
        ? 'conditions are not supported; which rows a caller reaches is row scope'
        : `unknown property "${key}"`,
    );

  const action: unknown = Reflect.get(rule, 'action');
  const subject: unknown = Reflect.get(rule, 'subject');
  const fields: unknown = Reflect.get(rule, 'fields');
  const inverted: unknown = Reflect.get(rule, 'inverted');
  const reason: unknown = Reflect.get(rule, 'reason');

  const actions = toStrings(action);
  const subjects = toStrings(subject);

  if (!actions?.length) {
    problems.push('action must be a string or a non-empty list of strings');
  }

  for (const name of actions ?? []) {
    const match = name.match(ACTION_PATTERN);

    if (!match) {
      problems.push(`action "${name}" must be <action>:<any|own>`);
    } else if (match[1] === RESERVED_ACTION) {
      problems.push(`action "${name}" is reserved`);
    }
  }

  if (!subjects?.length) {
    problems.push('subject must be a string or a non-empty list of strings');
  }

  for (const name of subjects ?? []) {
    if (!name.trim()) {
      problems.push('subject is blank');
    } else if (name === RESERVED_SUBJECT) {
      problems.push(`subject "${name}" is reserved`);
    }
  }

  if (fields !== undefined) {
    const list = Array.isArray(fields) ? toStrings(fields) : undefined;

    if (!list) {
      problems.push('fields must be a list of strings');
    } else if (!list.length) {
      problems.push('fields is empty; leave it out to cover every field');
    } else if (list.some((field) => !field.trim())) {
      problems.push('fields has a blank entry');
    } else if (list.some((field) => field.includes('*'))) {
      problems.push(
        'fields name patterns, which are not supported; a field covers everything beneath it',
      );
    } else if (
      list.some((field) => field.split('.').some((s) => /^\d+$/.test(s)))
    ) {
      problems.push(
        'fields name array positions or numeric keys, which paths are checked without; name the field beneath them',
      );
    }
  }

  if (inverted !== undefined && typeof inverted !== 'boolean') {
    problems.push('inverted must be a boolean');
  }

  if (reason !== undefined && typeof reason !== 'string') {
    problems.push('reason must be a string');
  }

  return problems;
}

/**
 * Every problem with a rule set, each prefixed with `source`; empty when
 * the set can be used. A rule set is usable when every action is
 * `<action>:<possession>`, neither `manage` nor `all` appears, no rule has
 * conditions or an unknown property, and every `fields` list names fields,
 * without patterns.
 *
 * Rules may come from storage, so their types are checked too. Call it
 * before saving rules, as the module does before using them.
 */
export function accessRuleProblems(
  rules: readonly AccessRuleInterface[],
  source: string,
): string[] {
  if (!Array.isArray(rules)) {
    return [`${source}: rules must be an array`];
  }

  return rules.flatMap((rule: unknown, index) =>
    problemsOf(rule).map((problem) => `${source} rule ${index}: ${problem}`),
  );
}

/**
 * Every problem with grants keyed by actor: each key must be
 * `role:<name>` or `system:<name>`, and each rule set usable.
 */
export function accessGrantsProblems(grants: AccessGrants): string[] {
  return Object.entries(grants).flatMap(([key, rules]) =>
    ACTOR_KEY_PATTERN.test(key)
      ? accessRuleProblems(rules, key)
      : [`grants key "${key}": must be role:<name> or system:<name>`],
  );
}
