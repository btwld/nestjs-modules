import {
  type DynamicModule,
  Module,
  type PlainLiteralObject,
  type Type,
} from '@nestjs/common';

import { HookResolverService } from '@concepta/nestjs-core';

import { type RepositoryProviderOptions } from '../../interfaces/repository-provider-options.interface.js';
import { type RepositoryMetadataInterface } from '../../repository/interfaces/repository-metadata.interface.js';
import { getDynamicRepositoryToken } from '../../utils/get-dynamic-repository-token.js';

import {
  ACTIVITY_METADATA,
  ActivityEntityFixture,
  PAIR_METADATA,
  PairEntityFixture,
  TENANT_ACTIVITY_METADATA,
  TenantActivityEntityFixture,
  WIDGET_METADATA,
  WidgetEntityFixture,
} from './activity.fixture.js';
import {
  BUNDLE_METADATA,
  BundleEntityFixture,
  CATEGORY_METADATA,
  CategoryEntityFixture,
  INVOICE_LINE_METADATA,
  INVOICE_METADATA,
  InvoiceEntityFixture,
  InvoiceLineEntityFixture,
  LINE_NOTE_METADATA,
  LineNoteEntityFixture,
  PAYMENT_METADATA,
  PaymentEntityFixture,
  RECEIPT_METADATA,
  ReceiptEntityFixture,
  REFUND_METADATA,
  RefundEntityFixture,
} from './cascade.fixture.js';
import {
  ARCHIVED_POST_METADATA,
  ArchivedPostEntityFixture,
  AUTHOR_METADATA,
  AUTHOR_TAG_METADATA,
  AuthorEntityFixture,
  AuthorTagEntityFixture,
  COMPANY_METADATA,
  CompanyEntityFixture,
  DRIFTED_AUTHOR_METADATA,
  DriftedAuthorEntityFixture,
  POST_METADATA,
  PostEntityFixture,
  PROFILE_METADATA,
  ProfileEntityFixture,
  TAG_METADATA,
  TagEntityFixture,
} from './federation.fixture.js';
import {
  MemoryRepositoryFixture,
  type MemoryRepositoryOptionsFixture,
} from './memory-repository.fixture.js';
import {
  ORDER_LINE_METADATA,
  ORDER_METADATA,
  OrderEntityFixture,
  OrderLineEntityFixture,
  TENANT_ORDER_LINE_METADATA,
  TenantOrderLineEntityFixture,
} from './order.fixture.js';
import {
  NOTE_METADATA,
  NoteEntityFixture,
  PET_METADATA,
  PetEntityFixture,
} from './pet-note.fixture.js';
import {
  DRAFT_METADATA,
  DraftEntityFixture,
  PROJECT_METADATA,
  ProjectEntityFixture,
} from './project-draft.fixture.js';

const memory =
  <Entity extends PlainLiteralObject>(
    metadata: RepositoryMetadataInterface<Entity>,
  ) =>
  (key: string, options: MemoryRepositoryOptionsFixture) =>
    new MemoryRepositoryFixture(key, metadata, options);

const ADAPTERS = new Map<
  Type,
  (key: string, options: MemoryRepositoryOptionsFixture) => object
>([
  [WidgetEntityFixture, memory(WIDGET_METADATA)],
  [ActivityEntityFixture, memory(ACTIVITY_METADATA)],
  [TenantActivityEntityFixture, memory(TENANT_ACTIVITY_METADATA)],
  [PairEntityFixture, memory(PAIR_METADATA)],
  [InvoiceEntityFixture, memory(INVOICE_METADATA)],
  [InvoiceLineEntityFixture, memory(INVOICE_LINE_METADATA)],
  [LineNoteEntityFixture, memory(LINE_NOTE_METADATA)],
  [ReceiptEntityFixture, memory(RECEIPT_METADATA)],
  [PaymentEntityFixture, memory(PAYMENT_METADATA)],
  [RefundEntityFixture, memory(REFUND_METADATA)],
  [BundleEntityFixture, memory(BUNDLE_METADATA)],
  [CategoryEntityFixture, memory(CATEGORY_METADATA)],
  [TenantOrderLineEntityFixture, memory(TENANT_ORDER_LINE_METADATA)],
  [ProjectEntityFixture, memory(PROJECT_METADATA)],
  [DraftEntityFixture, memory(DRAFT_METADATA)],
  [
    OrderEntityFixture,
    (key, options) => new MemoryRepositoryFixture(key, ORDER_METADATA, options),
  ],
  [
    OrderLineEntityFixture,
    (key, options) =>
      new MemoryRepositoryFixture(key, ORDER_LINE_METADATA, options),
  ],
  [
    PetEntityFixture,
    (key, options) => new MemoryRepositoryFixture(key, PET_METADATA, options),
  ],
  [
    NoteEntityFixture,
    (key, options) => new MemoryRepositoryFixture(key, NOTE_METADATA, options),
  ],
  [
    AuthorEntityFixture,
    (key, options) =>
      new MemoryRepositoryFixture(key, AUTHOR_METADATA, options),
  ],
  [
    ArchivedPostEntityFixture,
    (key, options) =>
      new MemoryRepositoryFixture(key, ARCHIVED_POST_METADATA, options),
  ],
  [
    DriftedAuthorEntityFixture,
    (key, options) =>
      new MemoryRepositoryFixture(key, DRIFTED_AUTHOR_METADATA, options),
  ],
  [
    PostEntityFixture,
    (key, options) => new MemoryRepositoryFixture(key, POST_METADATA, options),
  ],
  [
    ProfileEntityFixture,
    (key, options) =>
      new MemoryRepositoryFixture(key, PROFILE_METADATA, options),
  ],
  [
    CompanyEntityFixture,
    (key, options) =>
      new MemoryRepositoryFixture(key, COMPANY_METADATA, options),
  ],
  [
    TagEntityFixture,
    (key, options) => new MemoryRepositoryFixture(key, TAG_METADATA, options),
  ],
  [
    AuthorTagEntityFixture,
    (key, options) =>
      new MemoryRepositoryFixture(key, AUTHOR_TAG_METADATA, options),
  ],
]);

/**
 * A driver over `MemoryRepositoryFixture`, for registering through
 * `RepositoryModule.forRoot()`. Like a real driver, it hands each adapter the
 * optional hook resolver, and binds nothing itself.
 */
@Module({})
export class MemoryRepositoryModuleFixture {
  static register(entities: RepositoryProviderOptions[]): DynamicModule {
    return {
      module: MemoryRepositoryModuleFixture,
      providers: entities.map(({ key, entity }) => ({
        provide: getDynamicRepositoryToken(key),
        inject: [{ token: HookResolverService, optional: true }],
        useFactory: (hookResolver?: HookResolverService) => {
          const create = ADAPTERS.get(entity);
          if (!create) {
            throw new Error(`No memory adapter for ${entity.name}`);
          }
          return create(key, { hookResolver });
        },
      })),
    };
  }
}
