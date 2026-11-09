// module
export { FileModule } from './file.module.js';

// domain aggregates
export { File } from './domain/aggregates/file.js';

// repositories
export { FileRepository } from './infrastructure/persistence/file.repository.js';
export { FileRepositoryInterface } from './domain/repositories/file-repository.interface.js';
export { FileMapper } from './infrastructure/persistence/file.mapper.js';

// domain services
export { FileStorageService } from './domain/services/file-storage.service.js';
export { FileLifecycleService } from './domain/services/file-lifecycle.service.js';
export { FileScanService } from './domain/services/file-scan.service.js';

// domain policies
export {
  FileUploadPolicy,
  FileUploadPolicySettings,
} from './domain/policies/file-upload.policy.js';

// schemas (Zod / Standard Schema)
export { fileSchema } from './infrastructure/schemas/file.schema.js';
export { fileCreateSchema } from './infrastructure/schemas/file-create.schema.js';
export { fileScanOutcomeSchema } from './infrastructure/schemas/file-scan-outcome.schema.js';

// commands
export { CreateFileCommand } from './application/commands/impl/create-file.command.js';
export { ConfirmFileUploadCommand } from './application/commands/impl/confirm-file-upload.command.js';
export { SoftDeleteFileCommand } from './application/commands/impl/soft-delete-file.command.js';
export { RestoreFileCommand } from './application/commands/impl/restore-file.command.js';
export { RemoveFileCommand } from './application/commands/impl/remove-file.command.js';
export { RecordFileScanResultCommand } from './application/commands/impl/record-file-scan-result.command.js';

// queries
export { GetFileQuery } from './application/queries/impl/get-file.query.js';
export { GetFileDownloadQuery } from './application/queries/impl/get-file-download.query.js';

// command handlers
export { CreateFileHandler } from './application/commands/handlers/create-file.handler.js';
export { ConfirmFileUploadHandler } from './application/commands/handlers/confirm-file-upload.handler.js';
export { SoftDeleteFileHandler } from './application/commands/handlers/soft-delete-file.handler.js';
export { RestoreFileHandler } from './application/commands/handlers/restore-file.handler.js';
export { RemoveFileHandler } from './application/commands/handlers/remove-file.handler.js';
export { RecordFileScanResultHandler } from './application/commands/handlers/record-file-scan-result.handler.js';

// query handlers
export { GetFileHandler } from './application/queries/handlers/get-file.handler.js';
export { GetFileDownloadHandler } from './application/queries/handlers/get-file-download.handler.js';

// events
export { FileCreatedEvent } from './domain/events/file-created.event.js';
export { FileUploadConfirmedEvent } from './domain/events/file-upload-confirmed.event.js';
export { FileSoftDeletedEvent } from './domain/events/file-soft-deleted.event.js';
export { FileRestoredEvent } from './domain/events/file-restored.event.js';
export { FileRemoveFailedEvent } from './domain/events/file-remove-failed.event.js';
export { FileRemovedEvent } from './domain/events/file-removed.event.js';
export { FileScanPassedEvent } from './domain/events/file-scan-passed.event.js';
export { FileScanRetriedEvent } from './domain/events/file-scan-retried.event.js';
export { FileRejectedEvent } from './domain/events/file-rejected.event.js';

// persistence interfaces
export { FileEntityInterface } from './infrastructure/persistence/interfaces/file-entity.interface.js';

// domain interfaces
export { FileInterface } from './domain/interfaces/file.interface.js';
export { FileCreatableInterface } from './domain/interfaces/file-creatable.interface.js';
export { FileObjectInterface } from './domain/interfaces/file-object.interface.js';
export { FileUploadTargetInterface } from './domain/interfaces/file-upload-target.interface.js';
export { FileUploadPolicyRule } from './domain/interfaces/file-upload-policy-rule.type.js';
export { FileOwnableInterface } from './domain/interfaces/file-ownable.interface.js';
export { FileReadOptionsInterface } from './domain/interfaces/file-read-options.interface.js';
export { FileStorageServiceInterface } from './domain/interfaces/file-storage-service.interface.js';
export { FileScannedStorageServiceInterface } from './domain/interfaces/file-scanned-storage-service.interface.js';
export { FileScanServiceInterface } from './domain/interfaces/file-scan-service.interface.js';
export { FileScanRequestInterface } from './domain/interfaces/file-scan-request.interface.js';
export { FileScanOutcomeInterface } from './domain/interfaces/file-scan-outcome.interface.js';
export {
  FileScanResult,
  FILE_SCAN_RESULTS,
} from './domain/interfaces/file-scan-result.type.js';
export { FileScanAttempt } from './domain/interfaces/file-scan-attempt.type.js';
export { FileLifecycleStepInterface } from './domain/interfaces/file-lifecycle-step.interface.js';
export { FileCreatedResultInterface } from './domain/interfaces/file-created-result.interface.js';
export { FileReadResultInterface } from './domain/interfaces/file-read-result.interface.js';
export { FileGetOptionsInterface } from './domain/interfaces/file-get-options.interface.js';
export {
  FileStatus,
  FILE_STATUSES,
} from './domain/interfaces/file-status.type.js';

// config interfaces
export { FileOptionsInterface } from './infrastructure/config/interfaces/file-options.interface.js';
export { FileOptionsBaseInterface } from './infrastructure/config/interfaces/file-options-base.interface.js';
export { FileUnscannedOptionsInterface } from './infrastructure/config/interfaces/file-unscanned-options.interface.js';
export { FileScannedOptionsInterface } from './infrastructure/config/interfaces/file-scanned-options.interface.js';
export {
  FileExtrasInterface,
  FileRepositoryConstructor,
} from './infrastructure/config/interfaces/file-extras.interface.js';
export { FileSettingsInterface } from './infrastructure/config/interfaces/file-settings.interface.js';

// exceptions
export { FileException } from './domain/exceptions/file.exception.js';
export { FileStatusException } from './domain/exceptions/file-status.exception.js';
export { FileStorageNotFoundException } from './domain/exceptions/file-storage-not-found.exception.js';
export { FileUploadTargetException } from './domain/exceptions/file-upload-target.exception.js';
export { FileUploadPolicyException } from './domain/exceptions/file-upload-policy.exception.js';
export { FileDownloadUrlException } from './domain/exceptions/file-download-url.exception.js';
export { FileExistsCheckException } from './domain/exceptions/file-exists-check.exception.js';
export { FileStorageDeleteException } from './domain/exceptions/file-storage-delete.exception.js';
export { FileNameInvalidException } from './domain/exceptions/file-name-invalid.exception.js';
export { FileNotUploadedException } from './domain/exceptions/file-not-uploaded.exception.js';
export { FileNotFoundException } from './application/exceptions/file-not-found.exception.js';
export { FileRemoveException } from './application/exceptions/file-remove.exception.js';
export { FileRemoveInTransactionException } from './application/exceptions/file-remove-in-transaction.exception.js';
export { FileScanRequestException } from './domain/exceptions/file-scan-request.exception.js';
export { FileRejectException } from './application/exceptions/file-reject.exception.js';
export { FileScanResultInTransactionException } from './application/exceptions/file-scan-result-in-transaction.exception.js';
