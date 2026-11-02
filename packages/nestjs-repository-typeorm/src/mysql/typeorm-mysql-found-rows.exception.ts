import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when a MySQL data source turns off the `FOUND_ROWS`
 * client flag. Without it, MySQL reports the rows a write changed rather
 * than the rows it matched, so a versioned write that changes nothing would
 * be mistaken for a conflict.
 */
export class TypeOrmMysqlFoundRowsException extends RuntimeException {
  declare context: RuntimeException['context'] & { entityName: string };

  constructor(entityName: string, options?: RuntimeExceptionOptions) {
    super({
      message:
        'Entity %s uses a MySQL data source whose flags turn off FOUND_ROWS. ' +
        'Remove "-FOUND_ROWS" from the data source flags',
      messageParams: [entityName],
      fault: 'usage',
      ...options,
    });

    this.context = { ...this.context, entityName };
    this.errorCode = 'TYPEORM_MYSQL_FOUND_ROWS';
  }
}
