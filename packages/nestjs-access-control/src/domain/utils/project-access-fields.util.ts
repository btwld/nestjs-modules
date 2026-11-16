import {
  normalizeAccessFieldPath,
  toWire,
  toWireArray,
  toWireRecord,
} from './access-field-paths.util.js';

const OMIT = Symbol('omit');

type Allowed = (path: string) => boolean;

/**
 * The prototype a projection of `source` keeps: a class instance's, unless
 * it has `toJSON`, so a serializer that runs afterwards still recognises
 * it. Anything else is projected into a plain object.
 */
function keptPrototype(source: unknown): object | undefined {
  if (
    typeof source !== 'object' ||
    source === null ||
    toWire(source) !== source
  ) {
    return undefined;
  }

  const prototype: unknown = Object.getPrototypeOf(source);

  return typeof prototype === 'object' &&
    prototype !== null &&
    prototype !== Object.prototype
    ? prototype
    : undefined;
}

/**
 * The getters and methods a prototype chain carries, which a class
 * serializer may read or call to fill a field.
 */
function prototypeMembers(prototype: object): string[] {
  const members = new Set<string>();
  let current: unknown = prototype;

  while (
    typeof current === 'object' &&
    current !== null &&
    current !== Object.prototype
  ) {
    for (const [key, descriptor] of Object.entries(
      Object.getOwnPropertyDescriptors(current),
    )) {
      if (
        key !== 'constructor' &&
        (descriptor.get || typeof descriptor.value === 'function')
      ) {
        members.add(key);
      }
    }

    current = Object.getPrototypeOf(current);
  }

  return [...members];
}

const pathOf = (prefix: string, key: string) =>
  prefix ? `${prefix}.${key}` : key;

function projectRecord(
  source: unknown,
  record: Record<string, unknown>,
  allowed: Allowed,
  prefix: string,
): Record<string, unknown> {
  const prototype = keptPrototype(source);
  const projected: Record<string, unknown> = prototype
    ? Object.create(prototype)
    : {};

  for (const [key, child] of Object.entries(record)) {
    const value = projectChild(
      child,
      allowed,
      prefix ? `${prefix}.${key}` : key,
    );

    if (value !== OMIT) {
      // Defined, not assigned, so a `__proto__` key stays plain data.
      Object.defineProperty(projected, key, {
        value,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
  }

  if (prototype) {
    hideDeniedMembers(projected, prototype, allowed, prefix);
  }

  return projected;
}

/**
 * A kept prototype still carries its getters and methods, which a class
 * serializer would read or call. Each one the caller may not read is
 * shadowed by an own `undefined`, so it cannot be sent.
 */
function hideDeniedMembers(
  projected: Record<string, unknown>,
  prototype: object,
  allowed: Allowed,
  prefix: string,
): void {
  for (const key of prototypeMembers(prototype)) {
    if (
      !Object.prototype.hasOwnProperty.call(projected, key) &&
      !allowed(pathOf(prefix, key))
    ) {
      Object.defineProperty(projected, key, {
        value: undefined,
        enumerable: false,
        writable: true,
        configurable: true,
      });
    }
  }
}

function projectItems(
  items: unknown[],
  allowed: Allowed,
  path: string,
): unknown {
  const kept = items.flatMap((item) => {
    const value = projectChild(item, allowed, path);
    return value === OMIT ? [] : [value];
  });

  return kept.length || (!items.length && allowed(path)) ? kept : OMIT;
}

function projectChild(child: unknown, allowed: Allowed, path: string): unknown {
  const items = toWireArray(child);

  if (items) {
    return projectItems(items, allowed, path);
  }

  const record = toWireRecord(child);

  if (record && Object.keys(record).length) {
    const projected = projectRecord(child, record, allowed, path);
    return Object.keys(projected).length ? projected : OMIT;
  }

  const prototype = keptPrototype(child);

  // A class instance with no own fields can still expose getters and
  // methods: kept as is only when none of them is denied.
  if (record && prototype) {
    if (!allowed(path)) {
      return OMIT;
    }

    return prototypeMembers(prototype).some(
      (key) => !allowed(pathOf(path, key)),
    )
      ? projectRecord(child, record, allowed, path)
      : child;
  }

  return allowed(path) ? child : OMIT;
}

/**
 * Each item of a top-level list projected on its own, leaving out items
 * the caller may not see at all.
 */
function projectEach(items: unknown[], allowed: Allowed): unknown[] {
  return items.flatMap((item) => {
    const projected = projectAccessFields(item, allowed);
    return projected === undefined && item !== undefined ? [] : [projected];
  });
}

// The counters of a page's wrapper, kept as they are when they are
// numbers; any other field of the wrapper is filtered like a record's.
const PAGE_COUNTERS = ['count', 'total', 'page', 'pageCount'];
const PAGE_KEYS = new Set([...PAGE_COUNTERS, 'limit']);

/**
 * Keeps only the fields `allowed` accepts, as the value goes over the
 * wire. Paths are checked without array positions or numeric keys, as
 * write checks are, so a rule on `items.amount` covers every item. Filters
 * each item of an array at any depth, and each item of a page's `data` (the
 * shape CRUD uses for its paginated responses) while keeping the page's
 * counters. A value with no fields, such as a string, cannot be filtered:
 * it is kept only when `allowed('')` accepts the resource as a whole.
 */
export function projectAccessFields(value: unknown, allowed: Allowed): unknown {
  const allowedPath: Allowed = (path) =>
    allowed(normalizeAccessFieldPath(path));

  const items = toWireArray(value);

  if (items) {
    return projectEach(items, allowed);
  }

  const record = toWireRecord(value);

  if (!record) {
    return allowed('') ? value : undefined;
  }

  const data = toWireArray(record.data);

  if (data && PAGE_COUNTERS.every((key) => typeof record[key] === 'number')) {
    const counters = Object.entries(record).filter(
      ([key, field]) => PAGE_KEYS.has(key) && typeof field === 'number',
    );
    const fields = Object.fromEntries(
      Object.entries(record).filter(([key]) => key !== 'data'),
    );

    // The wrapper's fields are filtered like a record's, then its counters
    // and its filtered items laid over them.
    return {
      ...projectRecord(fields, fields, allowedPath, ''),
      ...Object.fromEntries(counters),
      data: projectEach(data, allowed),
    };
  }

  return projectRecord(value, record, allowedPath, '');
}
