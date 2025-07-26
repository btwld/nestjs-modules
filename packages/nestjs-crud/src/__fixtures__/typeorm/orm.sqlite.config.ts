import { join } from 'path';

import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const ormSqliteConfig: TypeOrmModuleOptions = {
  type: 'sqlite',
  database: ':memory:',
  entities: [join(__dirname, './**/*.entity{.ts,.js}')],
  synchronize: true,
};
