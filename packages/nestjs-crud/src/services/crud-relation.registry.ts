import { PlainLiteralObject } from '@nestjs/common';

import { CrudException } from '../exceptions/crud.exception';
import { QueryRelation } from '../request/types/crud-request-query.types';

import { CrudFetchServiceInterface } from './interfaces/crud-fetch-service.interface';
import { CrudRelationBindingInterface } from './interfaces/crud-relation-binding.interface';

/**
 * Registry to manage relation configuration mappings between root and relation entities.
 *
 * This class provides functionality to register CRUD services for relation entities
 * and convert internal bindings to the registry format required by federation services.
 * It acts as a bridge between service configuration and runtime service resolution.
 */
export class CrudRelationRegistry<
  Entity extends PlainLiteralObject,
  Relations extends PlainLiteralObject[],
> {
  private services: CrudFetchServiceInterface<Relations[number]>[] = [];

  /**
   * Gets a service by constructor type.
   *
   * @param serviceType - The service constructor to find
   * @returns The matching service instance or undefined
   */
  private getService(
    serviceType: NewableFunction,
  ): CrudFetchServiceInterface<Relations[number]> | undefined {
    return this.services.find((svc) => svc.constructor === serviceType);
  }

  /**
   * Registers a relation service.
   * Ensures only one instance per service class type is registered.
   *
   * @param service - The CRUD service capable of fetching the relation entities
   */
  register(service: CrudFetchServiceInterface<Relations[number]>): void {
    if (!this.getService(service.constructor)) {
      this.services.push(service);
    }
  }

  /**
   * Gets relation bindings for the specified relations.
   *
   * @param relations - Array of relation configurations to get bindings for
   * @returns Array of relation bindings with services and relation metadata
   */
  getBindings(
    relations: QueryRelation<Entity, Relations[number]>[],
  ): CrudRelationBindingInterface<Entity, Relations[number]>[] {
    return relations.map((relation) => {
      const service = this.getService(relation.service);
      if (!service) {
        throw new CrudException({
          message: 'Relation service not found for relation service type: %s',
          messageParams: [relation.service.name],
        });
      }
      // Return a new binding that uses the relation from the request
      // but the service from the registry
      return { relation, service };
    });
  }
}
