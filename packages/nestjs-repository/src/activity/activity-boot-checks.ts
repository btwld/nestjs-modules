import { type PlainLiteralObject } from '@nestjs/common';

import { type RepositoryProviderOptions } from '../interfaces/repository-provider-options.interface.js';
import { type RepositoryAdapter } from '../repository/repository-adapter.js';
import { isRowScopeScoped } from '../row-scope/interfaces/row-scope-registration.interface.js';
import { isAppendOnly } from '../write-policy/interfaces/write-policy-registration.interface.js';

import { type ActivityBinding } from './interfaces/activity-binding.interface.js';
import { ACTIVITY_COLUMNS } from './interfaces/activity.interface.js';

type AnyAdapter = RepositoryAdapter<PlainLiteralObject>;

/**
 * An entity's activity binding, from its `forRoot()` `activity` entry, and a
 * message for each reason it cannot be bound.
 *
 * The entity must have a single-column primary key, so each record names its
 * row by one value. The store
 * must be another registered entity, append-only, not itself recorded, and
 * carry every column of `ActivityInterface`; for a scoped entity it must also
 * declare a row scope, scoped or public. `omit` names the entity's own
 * columns, and only alongside `values`.
 */
export function activityBindingOf(
  options: RepositoryProviderOptions,
  adapter: AnyAdapter,
  registered: ReadonlyMap<
    string,
    { options: RepositoryProviderOptions; adapter: AnyAdapter }
  >,
): { binding?: ActivityBinding; failures: string[] } {
  const registration = options.activity;
  if (!registration) return { failures: [] };

  const label = `"${options.key}" activity`;
  const failures: string[] = [];
  const columns = new Set<string>(
    adapter.metadata.columns.map((column) => column.name),
  );
  const omit = registration.omit ?? [];

  const primary = adapter.metadata.columns
    .filter((column) => column.isPrimary)
    .map((column) => column.name);
  const [primaryColumn] = primary;
  if (primary.length !== 1) {
    failures.push(
      `${label} cannot identify its rows: ${adapter.metadata.name} needs a ` +
        `single-column primary key, and has ${primary.length} key columns.`,
    );
  }

  if (omit.length && !registration.values) {
    failures.push(
      `${label} omits columns but records no values. Set values: true, or ` +
        'remove omit.',
    );
  }
  for (const column of omit) {
    if (!columns.has(column)) {
      failures.push(
        `${label} omits "${column}", which is not a column of ` +
          `${adapter.metadata.name}.`,
      );
    }
  }

  const store = registered.get(registration.store);
  if (!store) {
    failures.push(
      `${label} names store "${registration.store}", which is not ` +
        'registered in forRoot().',
    );
    return { failures };
  }

  if (store.options.key === options.key) {
    failures.push(`${label} cannot name its own entity as the store.`);
  } else if (store.options.activity) {
    failures.push(
      `${label} names store "${registration.store}", which is itself ` +
        'recorded. A store cannot record its own writes.',
    );
  }

  // The store holds copies of the entity's rows, so a store nobody scoped
  // would show every scope's records to every reader.
  if (isRowScopeScoped(options.rowScope) && !store.options.rowScope) {
    failures.push(
      `${label} names store "${registration.store}", which declares no ` +
        `rowScope while ${adapter.metadata.name} is scoped. Scope the store, ` +
        "or declare it rowScope: { access: 'public', reason }.",
    );
  }

  if (!isAppendOnly(store.options.writePolicy)) {
    failures.push(
      `${label} names store "${registration.store}", which is not ` +
        "append-only. Set writePolicy: { access: 'append-only', reason } on it.",
    );
  }

  const storeColumns = new Set<string>(
    store.adapter.metadata.columns.map((column) => column.name),
  );
  const missing = ACTIVITY_COLUMNS.filter(
    (column) => !storeColumns.has(column),
  );
  if (missing.length) {
    failures.push(
      `${label} names store "${registration.store}", which lacks columns: ` +
        `${missing.join(', ')}. Extend your driver's activity base entity.`,
    );
  }

  if (failures.length || !primaryColumn) return { failures };

  return {
    binding: {
      store: store.adapter,
      primaryColumn,
      values: registration.values ?? false,
      omit: new Set(omit),
    },
    failures,
  };
}
