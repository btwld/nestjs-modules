import {
  RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-core';

/**
 * Exception thrown when transaction settings are declared for a data source
 * whose database does not support them.
 */
export class TypeOrmTransactionSettingsUnsupportedException extends RuntimeException {
  declare context: RuntimeException['context'] & {
    dataSourceKey: string;
    database: string;
  };

  constructor(
    dataSourceKey: string,
    database: string,
    options?: RuntimeExceptionOptions,
  ) {
    super({
      message:
        'Data source "%s" is "%s", but transactionSettings needs Postgres',
      messageParams: [dataSourceKey, database],
      fault: 'usage',
      ...options,
    });

    this.context = { ...this.context, dataSourceKey, database };
    this.errorCode = 'TYPEORM_TRANSACTION_SETTINGS_UNSUPPORTED';
  }
}
