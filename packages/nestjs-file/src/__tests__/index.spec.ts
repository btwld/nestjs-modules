import {
  ConfirmFileUploadCommand,
  ConfirmFileUploadHandler,
  CreateFileCommand,
  CreateFileHandler,
  File,
  FILE_STATUSES,
  FileCreatedEvent,
  fileCreateSchema,
  FileDownloadUrlException,
  FileException,
  FileExistsCheckException,
  FileLifecycleService,
  FileModule,
  FileNameInvalidException,
  FileNotFoundException,
  FileNotUploadedException,
  FileRemovedEvent,
  FileRejectedEvent,
  FileRejectException,
  FileScanPassedEvent,
  FileScanRequestException,
  FileScanResultInTransactionException,
  FileScanRetriedEvent,
  FileScanService,
  RecordFileScanResultCommand,
  RecordFileScanResultHandler,
  RequestFileScanCommand,
  RequestFileScanHandler,
  FileRemoveException,
  FileRemoveFailedEvent,
  FileStorageDeleteException,
  FileRemoveInTransactionException,
  FileRepository,
  FileRestoredEvent,
  fileSchema,
  FileSoftDeletedEvent,
  FileStatusException,
  FileStorageNotFoundException,
  FileStorageService,
  FileUploadConfirmedEvent,
  FileUploadPolicyException,
  FileUploadPolicy,
  FileUploadTargetException,
  GetFileDownloadHandler,
  GetFileDownloadQuery,
  GetFileHandler,
  GetFileQuery,
  RemoveFileCommand,
  RemoveFileHandler,
  RestoreFileCommand,
  RestoreFileHandler,
  SoftDeleteFileCommand,
  SoftDeleteFileHandler,
} from '../index.js';

describe('index', () => {
  it('should export FileModule', () => {
    expect(FileModule).toBeInstanceOf(Function);
  });

  it('should export the File aggregate and its repository', () => {
    expect(File).toBeInstanceOf(Function);
    expect(FileRepository).toBeInstanceOf(Function);
  });

  it('should export domain services', () => {
    expect(FileStorageService).toBeInstanceOf(Function);
    expect(FileLifecycleService).toBeInstanceOf(Function);
    expect(FileUploadPolicy).toBeInstanceOf(Function);
    expect(FileScanService).toBeInstanceOf(Function);
  });

  it('should export schemas', () => {
    expect(fileSchema.meta).toBeInstanceOf(Function);
    expect(fileCreateSchema.meta).toBeInstanceOf(Function);
  });

  it('should export the statuses', () => {
    expect(FILE_STATUSES).toEqual([
      'pending',
      'scanning',
      'rescanning',
      'active',
      'rejecting',
      'rejected',
      'removing',
      'remove-failed',
    ]);
  });

  it('should export commands', () => {
    expect(CreateFileCommand).toBeInstanceOf(Function);
    expect(ConfirmFileUploadCommand).toBeInstanceOf(Function);
    expect(SoftDeleteFileCommand).toBeInstanceOf(Function);
    expect(RestoreFileCommand).toBeInstanceOf(Function);
    expect(RemoveFileCommand).toBeInstanceOf(Function);
    expect(RecordFileScanResultCommand).toBeInstanceOf(Function);
    expect(RequestFileScanCommand).toBeInstanceOf(Function);
  });

  it('should export queries', () => {
    expect(GetFileQuery).toBeInstanceOf(Function);
    expect(GetFileDownloadQuery).toBeInstanceOf(Function);
  });

  it('should export handlers', () => {
    expect(CreateFileHandler).toBeInstanceOf(Function);
    expect(ConfirmFileUploadHandler).toBeInstanceOf(Function);
    expect(SoftDeleteFileHandler).toBeInstanceOf(Function);
    expect(RestoreFileHandler).toBeInstanceOf(Function);
    expect(RemoveFileHandler).toBeInstanceOf(Function);
    expect(RecordFileScanResultHandler).toBeInstanceOf(Function);
    expect(RequestFileScanHandler).toBeInstanceOf(Function);
    expect(GetFileHandler).toBeInstanceOf(Function);
    expect(GetFileDownloadHandler).toBeInstanceOf(Function);
  });

  it('should export events', () => {
    expect(FileCreatedEvent).toBeInstanceOf(Function);
    expect(FileUploadConfirmedEvent).toBeInstanceOf(Function);
    expect(FileSoftDeletedEvent).toBeInstanceOf(Function);
    expect(FileRestoredEvent).toBeInstanceOf(Function);
    expect(FileRemoveFailedEvent).toBeInstanceOf(Function);
    expect(FileRemovedEvent).toBeInstanceOf(Function);
    expect(FileScanPassedEvent).toBeInstanceOf(Function);
    expect(FileScanRetriedEvent).toBeInstanceOf(Function);
    expect(FileRejectedEvent).toBeInstanceOf(Function);
  });

  it('should export exceptions', () => {
    expect(FileException).toBeInstanceOf(Function);
    expect(FileStatusException).toBeInstanceOf(Function);
    expect(FileStorageNotFoundException).toBeInstanceOf(Function);
    expect(FileUploadTargetException).toBeInstanceOf(Function);
    expect(FileUploadPolicyException).toBeInstanceOf(Function);
    expect(FileDownloadUrlException).toBeInstanceOf(Function);
    expect(FileExistsCheckException).toBeInstanceOf(Function);
    expect(FileStorageDeleteException).toBeInstanceOf(Function);
    expect(FileNameInvalidException).toBeInstanceOf(Function);
    expect(FileNotUploadedException).toBeInstanceOf(Function);
    expect(FileNotFoundException).toBeInstanceOf(Function);
    expect(FileRemoveException).toBeInstanceOf(Function);
    expect(FileRemoveInTransactionException).toBeInstanceOf(Function);
    expect(FileScanRequestException).toBeInstanceOf(Function);
    expect(FileRejectException).toBeInstanceOf(Function);
    expect(FileScanResultInTransactionException).toBeInstanceOf(Function);
  });
});
