import { type RepositoryColumnMetadataInterface } from '../repository/interfaces/repository-column-metadata.interface.js';

/**
 * Column metadata as a driver would report it, for hand-built test metadata.
 */
export const columnFixture = (
  name: string,
  flags: Partial<Omit<RepositoryColumnMetadataInterface, 'name'>> = {},
): RepositoryColumnMetadataInterface => ({
  name,
  isPrimary: false,
  isRemoveDate: false,
  isVersion: false,
  ...flags,
});

/**
 * A target entity's own columns: its primary key, then the given columns.
 */
export const targetColumnsFixture = (
  primary: string,
  ...columns: string[]
): RepositoryColumnMetadataInterface[] => [
  columnFixture(primary, { isPrimary: true }),
  ...columns.map((name) => columnFixture(name)),
];
