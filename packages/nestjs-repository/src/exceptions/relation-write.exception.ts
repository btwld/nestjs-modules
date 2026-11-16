import { HttpStatus } from '@nestjs/common';

import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when a write payload carries a relation.
 *
 * A write sets the entity's own columns only. An owning relation is written
 * through its foreign key column; any other relation changes rows in another
 * table, which are written through their own repository so their row scope,
 * write policy and hooks run.
 */
export class RelationWriteException extends RuntimeException {
  declare context: RuntimeException['context'] & {
    entityName: string;
    relation: string;
    foreignKey: string[];
  };

  constructor(
    entityName: string,
    relation: string,
    foreignKey: string[],
    options?: RuntimeExceptionOptions,
  ) {
    super({
      ...(foreignKey.length
        ? {
            message: 'Cannot write %s.%s — send its foreign key %s instead',
            messageParams: [entityName, relation, foreignKey.join(', ')],
          }
        : {
            message:
              'Cannot write %s.%s — it would change rows in another table. ' +
              'Write those rows through their own repository',
            messageParams: [entityName, relation],
          }),
      httpStatus: HttpStatus.BAD_REQUEST,
      fault: 'client',
      ...options,
    });

    this.context = { ...this.context, entityName, relation, foreignKey };
    this.errorCode = 'RELATION_WRITE_REFUSED';
  }
}
