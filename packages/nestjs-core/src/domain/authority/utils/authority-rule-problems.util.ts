const RULE_KEYS = new Set([
  'action',
  'subject',
  'fields',
  'inverted',
  'pending',
  'reason',
]);
const VERB_PATTERN = /^[^\s:]+$/;

// CASL reads these as wildcards: a rule naming either would reach everything.
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

/**
 * Whether `value` is a plain object: what the checks below see is then all
 * a rule engine reads, with nothing inherited from a prototype of its own.
 */
function isPlainObject(value: unknown): value is object {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function problemsOf(rule: unknown): string[] {
  if (!isPlainObject(rule)) {
    return ['must be a plain object'];
  }

  // Every own key, hidden ones included, so none escapes the check.
  const problems = Reflect.ownKeys(rule).flatMap((key) => {
    const name = String(key);
    if (typeof key !== 'string' || !RULE_KEYS.has(key)) {
      return [
        name === 'conditions'
          ? 'conditions are not supported; which rows a caller reaches is row scope'
          : `unknown property "${name}"`,
      ];
    }

    // A getter could answer this check one way and the rule engine another.
    return Object.getOwnPropertyDescriptor(rule, key)?.get
      ? [`"${name}" must be a value, not a getter`]
      : [];
  });

  const action: unknown = Reflect.get(rule, 'action');
  const subject: unknown = Reflect.get(rule, 'subject');
  const fields: unknown = Reflect.get(rule, 'fields');
  const inverted: unknown = Reflect.get(rule, 'inverted');
  const pending: unknown = Reflect.get(rule, 'pending');
  const reason: unknown = Reflect.get(rule, 'reason');

  const actions = toStrings(action);
  const subjects = toStrings(subject);

  if (!actions?.length) {
    problems.push('action must be a string or a non-empty list of strings');
  }

  for (const name of actions ?? []) {
    if (!VERB_PATTERN.test(name)) {
      problems.push(`action "${name}" must be a verb, such as read or approve`);
    } else if (name === RESERVED_ACTION) {
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
      problems.push('fields name patterns, which are not supported');
    } else if (
      list.some((field) => field.split('.').some((s) => /^\d+$/.test(s)))
    ) {
      problems.push(
        'fields name array positions or numeric keys, which fields are checked without; name the field beneath them',
      );
    }
  }

  if (inverted !== undefined && typeof inverted !== 'boolean') {
    problems.push('inverted must be a boolean');
  }

  if (pending !== undefined) {
    if (typeof pending !== 'string' || !pending.trim()) {
      problems.push('pending must name its gate, a non-blank string');
    } else if (inverted !== true) {
      // Read as an allow, a pending rule would grant what it holds back.
      problems.push('pending is on a deny only: set inverted to true');
    }
  }

  if (reason !== undefined && typeof reason !== 'string') {
    problems.push('reason must be a string');
  }

  return problems;
}

/**
 * Every problem with a rule set (`AuthorityRuleInterface[]`), each prefixed
 * with `source`; empty when the set can be used. A set is usable when it is
 * an array and every rule is a plain object of plain values with no
 * property but `action`, `subject`, `fields`, `inverted`, `pending` and
 * `reason` (so no conditions); `action` and `subject` are each a string or a
 * non-empty list, every action a verb and every subject not blank, with
 * neither `manage` nor `all`; `fields`, when given, is a non-empty list
 * naming fields, with no blank entry, pattern or numeric segment;
 * `inverted` is a boolean; `pending`, when given, is a non-blank string on a
 * rule with `inverted: true`; `reason` is a string.
 *
 * Rules may come from storage, so anything is accepted and checked. Call it
 * before saving rules, as the rules' consumers do before using them.
 */
export function authorityRuleProblems(
  rules: unknown,
  source: string,
): string[] {
  if (!Array.isArray(rules)) {
    return [`${source}: rules must be an array`];
  }

  return rules.flatMap((rule: unknown, index) =>
    problemsOf(rule).map((problem) => `${source} rule ${index}: ${problem}`),
  );
}
