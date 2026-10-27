import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when a relation's TypeORM metadata is too incomplete to
 * describe to the repository.
 */
export class TypeOrmRelationMetadataException extends RuntimeException {
  declare context: RuntimeException['context'] & {
    relation: string;
    targetEntity: string;
  };

  constructor(
    relation: string,
    targetEntity: string,
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message:
        'Relation "%s" to %s has incomplete metadata. Add its @JoinColumn, ' +
        'or declare the inverse side of the relation',
      messageParams: [relation, targetEntity],
      fault: 'usage',
      ...options,
    });

    this.context = { ...this.context, relation, targetEntity };
    this.errorCode = 'TYPEORM_RELATION_METADATA';
  }
}
