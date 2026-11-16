import { type PlainLiteralObject } from '@nestjs/common';

import { type WhereClause } from '../repository/interfaces/where-clause.interface.js';

/** What a federated read needs from the root's own store. */
export interface FederationRoot {
  /**
   * The root rows matching `where`, holding at least `columns`, at most
   * `take` of them. Runs under the read's own row scope and soft delete.
   */
  rows(
    columns: string[],
    where: WhereClause | undefined,
    take: number,
  ): Promise<PlainLiteralObject[]>;
}
