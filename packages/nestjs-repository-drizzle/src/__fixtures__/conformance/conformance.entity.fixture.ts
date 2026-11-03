import {
  type ConformanceAuthorInterface,
  type ConformanceAwardInterface,
  type ConformanceBookInterface,
  type ConformanceBookWithEagerAuthorInterface,
  type ConformanceItemInterface,
  type ConformancePlainItemInterface,
  type ConformanceTagInterface,
  type ConformanceTenantOrderInterface,
  type ConformanceTenantOrderLineInterface,
} from '@concepta/nestjs-repository/conformance';

// The conformance suite's fixtures as entity classes, shared by every
// database's tables.

export class ConformanceItemEntity implements ConformanceItemInterface {
  declare id: number;
  declare name: string;
  declare rank: number | null;
  declare note: string | null;
  declare removedAt: Date | null;
  declare version: number;
}

export class ConformancePlainItemEntity implements ConformancePlainItemInterface {
  declare id: number;
  declare name: string;
}

export class ConformanceAuthorEntity implements ConformanceAuthorInterface {
  declare id: string;
  declare name: string;
  declare removedAt: Date | null;
}

export class ConformanceAwardEntity implements ConformanceAwardInterface {
  declare id: string;
  declare name: string;
  declare authorId: string | null;
}

export class ConformanceBookEntity implements ConformanceBookInterface {
  declare id: string;
  declare title: string;
  declare authorId: string | null;
  declare removedAt: Date | null;
}

export class ConformanceBookWithEagerAuthorEntity implements ConformanceBookWithEagerAuthorInterface {
  declare id: string;
  declare title: string;
  declare authorId: string | null;
  declare removedAt: Date | null;
}

export class ConformanceTagEntity implements ConformanceTagInterface {
  declare id: string;
  declare label: string;
}

export class ConformanceTenantOrderEntity implements ConformanceTenantOrderInterface {
  declare id: string;
  declare tenantId: string;
  declare total: number;
}

export class ConformanceTenantOrderLineEntity implements ConformanceTenantOrderLineInterface {
  declare id: string;
  declare tenantId: string;
  declare orderId: string;
  declare qty: number;
}
