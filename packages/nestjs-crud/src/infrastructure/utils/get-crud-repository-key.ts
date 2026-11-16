import { type PlainLiteralObject } from '@nestjs/common';

import {
  type CrudControllerClassOptionsInterface,
  type CrudControllerOptionsInterface,
} from '../interfaces/crud-controller-options.interface.js';
import { CrudMetaview } from '../services/crud-metaview.service.js';

import { type ConfigurableCrudOptions } from './interfaces/configurable-crud-options.interface.js';

/**
 * The controller's entity key, which is also its repository key, read from the
 * same options the builder reads. The adapter, in whatever form it is given,
 * reads that entity's repository.
 */
export function getCrudRepositoryKey<Entity extends PlainLiteralObject>(
  options: ConfigurableCrudOptions<Entity>,
): string | undefined {
  const { controller } = options;

  return isControllerClassOptions(controller)
    ? new CrudMetaview<Entity>().getEntity(controller.class)
    : controller.entity;
}

function isControllerClassOptions<Entity extends PlainLiteralObject>(
  controller:
    | CrudControllerClassOptionsInterface
    | CrudControllerOptionsInterface<Entity>,
): controller is CrudControllerClassOptionsInterface {
  return 'class' in controller && controller.class !== undefined;
}
