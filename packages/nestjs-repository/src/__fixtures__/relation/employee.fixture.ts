import { type PlainLiteralObject } from '@nestjs/common';

import { type RepositoryColumnMetadataInterface } from '../../repository/interfaces/repository-column-metadata.interface.js';
import { type RepositoryMetadataInterface } from '../../repository/interfaces/repository-metadata.interface.js';

export interface EmployeeFixture extends PlainLiteralObject {
  id: string;
}

export class EmployeeEntityFixture implements EmployeeFixture {
  [key: string]: unknown;
  declare id: string;
}

const column = (
  name: string,
  isPrimary = false,
): RepositoryColumnMetadataInterface => ({
  name,
  isPrimary,
  isVersion: false,
  isRemoveDate: false,
});

export const EMPLOYEE_COLUMNS = [
  column('id', true),
  column('name'),
  column('departmentId'),
  column('managerId'),
];

/**
 * One relation of each shape:
 * - `department` — owning, with its `departmentId` foreign key column;
 * - `reports` — one-to-many;
 * - `badge` — inverse one-to-one, no foreign key on this side.
 */
export const EMPLOYEE_METADATA: RepositoryMetadataInterface<EmployeeFixture> = {
  name: 'Employee',
  type: EmployeeEntityFixture,
  urn: 'urn:memory:Employee',
  columns: EMPLOYEE_COLUMNS,
  relations: [
    {
      name: 'department',
      targetEntity: 'Department',
      targetUrn: 'urn:memory:Department',
      targetColumns: [column('id', true), column('title')],
      cardinality: 'one',
      on: { from: 'departmentId', to: 'id' },
      foreignKey: [{ from: 'departmentId', to: 'id' }],
    },
    {
      name: 'reports',
      targetEntity: 'Employee',
      targetUrn: 'urn:memory:Employee',
      targetColumns: EMPLOYEE_COLUMNS,
      cardinality: 'many',
      on: { from: 'id', to: 'managerId' },
    },
    {
      name: 'badge',
      targetEntity: 'Badge',
      targetUrn: 'urn:memory:Badge',
      targetColumns: [column('id', true), column('employeeId')],
      cardinality: 'one',
      on: { from: 'id', to: 'employeeId' },
    },
  ],
};
