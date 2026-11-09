import { type PlainLiteralObject, type Type } from '@nestjs/common';

import { type CrudCommandInterface } from '../../../application/commands/interfaces/crud-command.interface.js';
import { CRUD_MODULE_ROUTE_COMMAND_METADATA } from '../../../crud.constants.js';
import {
  CrudMetadataLookupTarget,
  CrudMetadata,
} from '../../services/crud-metadata.service.js';

/**
 * Options for CrudCommand decorator.
 */
export interface CrudCommandOptionsInterface<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> {
  /** Custom command (command) class to use directly */
  command?: Type<CrudCommandInterface<Entity>>;
  /** Base command class for generating default command class */
  commandTemplate?: Type<CrudCommandInterface<Entity>>;
  /** Resolved command class (set by CrudInitCommand) */
  resolved?: Type<CrudCommandInterface<Entity>>;
}

/**
 * CRUD Commmand route decorator.
 *
 * Stores command options as metadata. The actual command class is resolved
 * later by CrudInitCommand, which applies defaults and generates classes.
 */
export const CrudCommand = CrudMetadata.createWrappedDecorator(
  {
    key: CRUD_MODULE_ROUTE_COMMAND_METADATA,
    lookupTarget: CrudMetadataLookupTarget.Method,
  },
  (decorator) =>
    <Entity extends PlainLiteralObject = PlainLiteralObject>(
      options: CrudCommandOptionsInterface<Entity>,
    ) =>
      decorator(options),
);
