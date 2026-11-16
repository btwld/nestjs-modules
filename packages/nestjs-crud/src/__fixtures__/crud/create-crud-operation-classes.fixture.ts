import { type PlainLiteralObject } from '@nestjs/common';

import { CrudCreateBatchCommand } from '../../application/commands/impl/crud-create-batch.command.js';
import { CrudCreateCommand } from '../../application/commands/impl/crud-create.command.js';
import { CrudDeleteCommand } from '../../application/commands/impl/crud-delete.command.js';
import { CrudReplaceCommand } from '../../application/commands/impl/crud-replace.command.js';
import { CrudRestoreCommand } from '../../application/commands/impl/crud-restore.command.js';
import { CrudSoftDeleteCommand } from '../../application/commands/impl/crud-soft-delete.command.js';
import { CrudUpdateCommand } from '../../application/commands/impl/crud-update.command.js';
import { CrudListQuery } from '../../application/queries/impl/crud-list.query.js';
import { CrudReadQuery } from '../../application/queries/impl/crud-read.query.js';
import {
  createCommand,
  createQuery,
} from '../../application/utils/create-operation-classes.js';

/**
 * Creates unique query and command classes for an entity.
 * Each call creates new class definitions with prefixed names.
 *
 * @param name - Prefix for class names (e.g., 'User' creates UserCrudListQuery)
 */
export function createCrudOperationClasses<Entity extends PlainLiteralObject>(
  name: string,
) {
  return {
    CrudListQuery: createQuery<Entity>(name, CrudListQuery<Entity>),
    CrudReadQuery: createQuery<Entity>(name, CrudReadQuery<Entity>),
    CrudCreateCommand: createCommand<Entity>(name, CrudCreateCommand<Entity>),
    CrudCreateBatchCommand: createCommand<Entity>(
      name,
      CrudCreateBatchCommand<Entity>,
    ),
    CrudUpdateCommand: createCommand<Entity>(name, CrudUpdateCommand<Entity>),
    CrudReplaceCommand: createCommand<Entity>(name, CrudReplaceCommand<Entity>),
    CrudDeleteCommand: createCommand<Entity>(name, CrudDeleteCommand<Entity>),
    CrudSoftDeleteCommand: createCommand<Entity>(
      name,
      CrudSoftDeleteCommand<Entity>,
    ),
    CrudRestoreCommand: createCommand<Entity>(name, CrudRestoreCommand<Entity>),
  };
}
