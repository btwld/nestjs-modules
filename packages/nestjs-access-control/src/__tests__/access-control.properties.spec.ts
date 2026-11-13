import fc from 'fast-check';

import {
  type AuthorityRuleInterface,
  authorityRuleProblems,
} from '@concepta/nestjs-core';

import { AccessControlService } from '../domain/services/access-control.service.js';
import {
  accessFieldPaths,
  normalizeAccessFieldPath,
} from '../domain/utils/access-field-paths.util.js';
import { accessGrantsProblems } from '../domain/utils/access-rule-problems.util.js';
import { canReadAccessField } from '../domain/utils/can-read-access-field.util.js';
import { createAccessAbility } from '../domain/utils/create-access-ability.util.js';
import { projectAccessFields } from '../domain/utils/project-access-fields.util.js';

/**
 * Properties the module promises, checked against an oracle written from
 * the README's rules rather than from the code: a rule allows a path it
 * covers, a deny always wins, and a field covers everything beneath it.
 */

// `AC_PROPERTY_RUNS=20000 pnpm test packages/nestjs-access-control` digs
// deeper locally.
const RUNS = { numRuns: Number(process.env.AC_PROPERTY_RUNS ?? 500) };

// A small vocabulary, so generated rules and data collide often. Data keys
// add numeric keys and names that are special to JavaScript.
const RULE_SEGMENTS = ['a', 'b', 'id', 'secret', 'items', '__proto__'];
const DATA_KEYS = [...RULE_SEGMENTS, '0', '12', 'constructor', 'toJSON'];
const SUBJECTS = ['r', 's'];
const ACTIONS = ['read', 'update', 'approve'];

const fieldPath = fc
  .array(fc.constantFrom(...RULE_SEGMENTS), { minLength: 1, maxLength: 3 })
  .map((segments) => segments.join('.'));

const rule: fc.Arbitrary<AuthorityRuleInterface<string>> = fc
  .record({
    action: fc.oneof(
      fc.constantFrom(...ACTIONS),
      fc.uniqueArray(fc.constantFrom(...ACTIONS), {
        minLength: 1,
        maxLength: 2,
      }),
    ),
    subject: fc.constantFrom(...SUBJECTS),
    fields: fc.option(
      fc.uniqueArray(fieldPath, { minLength: 1, maxLength: 3 }),
      { nil: undefined },
    ),
    inverted: fc.boolean(),
  })
  .map(({ fields, ...rest }) => (fields ? { ...rest, fields } : rest));

const rules = fc.array(rule, { maxLength: 6 });

const leaf = fc.oneof(
  fc.integer(),
  fc.string({ maxLength: 3 }),
  fc.boolean(),
  fc.constant(null),
);

/**
 * Plain JSON-like values, objects built with own properties so keys such
 * as `__proto__` are data, as `JSON.parse` makes them.
 */
const { record: dataRecord } = fc.letrec<{
  value: unknown;
  list: unknown[];
  record: Record<string, unknown>;
}>((tie) => ({
  value: fc.oneof({ depthSize: 'small' }, leaf, tie('list'), tie('record')),
  list: fc.array(tie('value'), { maxLength: 3 }),
  record: fc
    .array(fc.tuple(fc.constantFrom(...DATA_KEYS), tie('value')), {
      maxLength: 4,
    })
    .map((entries) => {
      const built: Record<string, unknown> = {};
      for (const [key, value] of entries) {
        Object.defineProperty(built, key, {
          value,
          enumerable: true,
          writable: true,
          configurable: true,
        });
      }
      return built;
    }),
}));

// The oracle.
const covers = (field: string, path: string) =>
  path === field || path.startsWith(`${field}.`);

const relevant = (
  all: AuthorityRuleInterface<string>[],
  action: string,
  subject: string,
) =>
  all.filter(
    (candidate) =>
      [candidate.action].flat().includes(action) &&
      [candidate.subject].flat().includes(subject),
  );

const reaches = (candidate: AuthorityRuleInterface<string>, path: string) =>
  !candidate.fields || candidate.fields.some((field) => covers(field, path));

/** Whether the rules allow `action` on `path` of `subject`. */
function oracleField(
  all: AuthorityRuleInterface<string>[],
  action: string,
  subject: string,
  path: string,
): boolean {
  const matching = relevant(all, action, subject);

  return (
    matching.some((c) => !c.inverted && reaches(c, path)) &&
    !matching.some((c) => c.inverted && reaches(c, path))
  );
}

/**
 * Whether the rules allow `action` on `subject` at all: any allow does,
 * and only a deny naming no fields refuses it.
 */
function oracleResource(
  all: AuthorityRuleInterface<string>[],
  action: string,
  subject: string,
): boolean {
  const matching = relevant(all, action, subject);

  return (
    matching.some((c) => !c.inverted) &&
    !matching.some((c) => c.inverted && !c.fields)
  );
}

describe('access control properties', () => {
  it('generates only usable rules', () => {
    fc.assert(
      fc.property(rules, (generated) => {
        expect(authorityRuleProblems(generated, 'generated')).toEqual([]);
      }),
      RUNS,
    );
  });

  it('decides every field as the rules say: a covering allow, and no covering deny', () => {
    fc.assert(
      fc.property(
        rules,
        fc.constantFrom(...ACTIONS),
        fc.constantFrom(...SUBJECTS),
        fieldPath,
        (generated, action, subject, path) => {
          expect(
            createAccessAbility(generated).can(action, subject, path),
          ).toBe(oracleField(generated, action, subject, path));
        },
      ),
      RUNS,
    );
  });

  it('decides the resource as the rules say, whatever order they come in', () => {
    fc.assert(
      fc.property(
        rules,
        fc.constantFrom(...ACTIONS),
        fc.constantFrom(...SUBJECTS),
        (generated, action, subject) => {
          const expected = oracleResource(generated, action, subject);

          expect(createAccessAbility(generated).can(action, subject)).toBe(
            expected,
          );
          expect(
            createAccessAbility([...generated].reverse()).can(action, subject),
          ).toBe(expected);
        },
      ),
      RUNS,
    );
  });

  it('never sends a field the caller may not read', () => {
    fc.assert(
      fc.property(rules, dataRecord, (generated, data) => {
        const readable = (path: string) =>
          oracleField(generated, 'read', 'r', path);
        const wire: unknown = JSON.parse(
          JSON.stringify(projectAccessFields(data, readable) ?? null),
        );

        // Paths are checked without array positions or numeric keys.
        for (const path of accessFieldPaths(wire).map(
          normalizeAccessFieldPath,
        )) {
          expect({ path, readable: readable(path) }).toEqual({
            path,
            readable: true,
          });
        }
      }),
      RUNS,
    );
  });

  it('keeps every field the caller may read, when nothing beside it is hidden', () => {
    fc.assert(
      fc.property(dataRecord, (data) => {
        expect(
          JSON.parse(JSON.stringify(projectAccessFields(data, () => true))),
        ).toEqual(JSON.parse(JSON.stringify(data)));
      }),
      RUNS,
    );
  });

  it('refuses a write exactly when it touches a field it may not write, or one above it', () => {
    const service = new AccessControlService(
      { actorFor: async () => undefined },
      { rulesFor: async () => [] },
    );

    fc.assert(
      fc.property(rules, dataRecord, (generated, body) => {
        const fields = accessFieldPaths(body);
        const denied = relevant(generated, 'update', 'r')
          .filter((c) => c.inverted)
          .flatMap((c) => c.fields ?? []);
        const expected =
          oracleResource(generated, 'update', 'r') &&
          fields
            .map(normalizeAccessFieldPath)
            .every(
              (field) =>
                oracleField(generated, 'update', 'r', field) &&
                !denied.some((d) => d.startsWith(`${field}.`)),
            );

        const refusal = service.refusal(
          {
            actor: { kind: 'role', roles: [] },
            ability: createAccessAbility(generated),
          },
          'update',
          'r',
          { fields },
        );

        expect({ fields, allowed: refusal === undefined }).toEqual({
          fields,
          allowed: expected,
        });
      }),
      RUNS,
    );
  });

  it('shows on a write what a read of the same record would', () => {
    fc.assert(
      fc.property(
        rules,
        fc.constantFrom(...SUBJECTS),
        fieldPath,
        (generated, resource, path) => {
          expect(
            canReadAccessField(
              createAccessAbility(generated),
              { resource },
              path,
            ),
          ).toBe(oracleField(generated, 'read', resource, path));
        },
      ),
      RUNS,
    );
  });

  it('reads paths the same however often they are normalized', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...DATA_KEYS), { minLength: 1, maxLength: 4 }),
        (segments) => {
          const path = segments.join('.');
          const once = normalizeAccessFieldPath(path);
          const numeric = (s: string) => /^\d+$/.test(s);

          expect(normalizeAccessFieldPath(once)).toEqual(once);
          // Never empty: a path of positions alone stays whole.
          expect(once).toEqual(
            segments.every(numeric)
              ? path
              : segments.filter((s) => !numeric(s)).join('.'),
          );
        },
      ),
      RUNS,
    );
  });

  it('lists problems for any stored value without throwing', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        const stored: AuthorityRuleInterface<string>[] = JSON.parse(
          JSON.stringify([value]),
        );

        expect(() =>
          accessGrantsProblems({ 'role:stored': stored }),
        ).not.toThrow();
      }),
      RUNS,
    );
  });

  it('builds an ability from every rule set it accepts', () => {
    // Usable rules mixed with arbitrary stored values, some of them close.
    const stored = fc.array(
      fc.oneof(
        rule,
        fc.jsonValue(),
        fc.record({
          action: fc.oneof(fc.string({ maxLength: 12 }), fc.jsonValue()),
          subject: fc.oneof(fc.constantFrom(...SUBJECTS), fc.jsonValue()),
        }),
      ),
      { maxLength: 4 },
    );

    fc.assert(
      fc.property(stored, (values) => {
        const parsed: AuthorityRuleInterface<string>[] = JSON.parse(
          JSON.stringify(values),
        );

        if (authorityRuleProblems(parsed, 'stored').length === 0) {
          expect(() =>
            createAccessAbility(parsed).can('read', 'r', 'a'),
          ).not.toThrow();
        }
      }),
      RUNS,
    );
  });
});
