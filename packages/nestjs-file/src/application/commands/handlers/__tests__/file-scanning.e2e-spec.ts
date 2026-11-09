import { type INestApplication } from '@nestjs/common';
import { CommandBus, EventBus, type IEvent, QueryBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';

import { TransactionScope } from '@concepta/nestjs-repository';

import { AppRepoModuleFixture } from '../../../../__tests__/fixtures/app-repo.module.fixture.js';
import {
  FakeScannedStorageService,
  FakeScanner,
  STORAGE_KEY,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { type File } from '../../../../domain/aggregates/file.js';
import { FileRejectedEvent } from '../../../../domain/events/file-rejected.event.js';
import { FileScanPassedEvent } from '../../../../domain/events/file-scan-passed.event.js';
import { FileScanRetriedEvent } from '../../../../domain/events/file-scan-retried.event.js';
import { FileScanRequestException } from '../../../../domain/exceptions/file-scan-request.exception.js';
import { FileStatusException } from '../../../../domain/exceptions/file-status.exception.js';
import { type FileScanOutcomeInterface } from '../../../../domain/interfaces/file-scan-outcome.interface.js';
import { FileRejectException } from '../../../exceptions/file-reject.exception.js';
import { FileScanResultInTransactionException } from '../../../exceptions/file-scan-result-in-transaction.exception.js';
import { GetFileDownloadQuery } from '../../../queries/impl/get-file-download.query.js';
import { GetFileQuery } from '../../../queries/impl/get-file.query.js';
import { ConfirmFileUploadCommand } from '../../impl/confirm-file-upload.command.js';
import { CreateFileCommand } from '../../impl/create-file.command.js';
import { RecordFileScanResultCommand } from '../../impl/record-file-scan-result.command.js';
import { RemoveFileCommand } from '../../impl/remove-file.command.js';
import { RequestFileScanCommand } from '../../impl/request-file-scan.command.js';

describe('file scanning (e2e)', () => {
  const dto = {
    serviceKey: STORAGE_KEY,
    fileName: 'insurance.pdf',
    contentType: 'application/pdf',
    size: 1024,
  };

  let app: INestApplication;
  let storage: FakeScannedStorageService;
  let scanner: FakeScanner;
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let events: IEvent[];

  beforeEach(async () => {
    storage = new FakeScannedStorageService();
    scanner = new FakeScanner();

    const moduleRef = await Test.createTestingModule({
      imports: [AppRepoModuleFixture.registerScanned(storage, scanner)],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    commandBus = app.get(CommandBus);
    queryBus = app.get(QueryBus);
    events = [];
    app.get(EventBus).subscribe((event) => events.push(event));
  });

  afterEach(async () => {
    await app?.close();
  });

  async function uploadedFile(): Promise<File> {
    const { file } = await commandBus.execute(new CreateFileCommand({}, dto));
    await commandBus.execute(new ConfirmFileUploadCommand({}, file.id));
    return file;
  }

  function record(file: File, scan: FileScanOutcomeInterface) {
    return commandBus.execute(
      new RecordFileScanResultCommand({}, file.id, scan),
    );
  }

  async function read(file: File): Promise<File> {
    return queryBus.execute(new GetFileQuery({}, file.id));
  }

  it('holds a confirmed upload for its scan, with no download url, until it passes', async () => {
    const { file } = await commandBus.execute(new CreateFileCommand({}, dto));

    const confirmed = await commandBus.execute(
      new ConfirmFileUploadCommand({}, file.id),
    );

    expect(confirmed).toEqual({ file: expect.any(Object) });
    expect(confirmed.file.status).toEqual('scanning');
    expect(scanner.requestScan).toHaveBeenCalledTimes(1);
    expect(scanner.requestScan).toHaveBeenCalledWith(
      {},
      { file: expect.objectContaining({ id: file.id }), attempt: 1 },
    );
    const held = await queryBus.execute(new GetFileDownloadQuery({}, file.id));
    expect(held).toEqual({ file: expect.any(Object) });

    const passed = await record(file, { attempt: 1, result: 'clean' });

    expect(passed.status).toEqual('active');
    expect(events.some((event) => event instanceof FileScanPassedEvent)).toBe(
      true,
    );
    const download = await queryBus.execute(
      new GetFileDownloadQuery({}, file.id),
    );
    expect(download.signedDownloadUrl).toEqual(
      `https://download.test/${file.id}`,
    );
  });

  it('asks for no second scan when the upload is confirmed again', async () => {
    const file = await uploadedFile();

    await commandBus.execute(new ConfirmFileUploadCommand({}, file.id));

    expect(scanner.requestScan).toHaveBeenCalledTimes(1);
  });

  it('rejects an infected file: deletes its object, keeps the record, and announces it', async () => {
    const file = await uploadedFile();

    const rejected = await record(file, { attempt: 1, result: 'infected' });

    expect(rejected.status).toEqual('rejected');
    expect((await read(file)).status).toEqual('rejected');
    expect(storage.delete).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ id: file.id }),
    );
    const announced = events.find(
      (event) => event instanceof FileRejectedEvent,
    );
    expect(announced).toEqual(
      new FileRejectedEvent(
        expect.anything(),
        expect.objectContaining({
          fileName: 'insurance.pdf',
          status: 'rejecting',
        }),
        { attempt: 1, result: 'infected' },
      ),
    );
    const download = await queryBus.execute(
      new GetFileDownloadQuery({}, file.id),
    );
    expect(download).toEqual({ file: expect.any(Object) });
  });

  it('rescans once after an uncertain result, and rejects a second uncertain one', async () => {
    const file = await uploadedFile();

    const rescanning = await record(file, { attempt: 1, result: 'uncertain' });

    expect(rescanning.status).toEqual('rescanning');
    expect(scanner.requestScan).toHaveBeenCalledTimes(2);
    expect(scanner.requestScan).toHaveBeenLastCalledWith(
      {},
      { file: expect.objectContaining({ id: file.id }), attempt: 2 },
    );
    expect(events.some((event) => event instanceof FileScanRetriedEvent)).toBe(
      true,
    );

    const rejected = await record(file, { attempt: 2, result: 'uncertain' });

    expect(rejected.status).toEqual('rejected');
    expect(storage.delete).toHaveBeenCalledTimes(1);
  });

  it('passes a file whose rescan is clean', async () => {
    const file = await uploadedFile();
    await record(file, { attempt: 1, result: 'uncertain' });

    const passed = await record(file, { attempt: 2, result: 'clean' });

    expect(passed.status).toEqual('active');
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('asks for the rescan again, changing nothing, when the first result is repeated during it', async () => {
    const file = await uploadedFile();
    await record(file, { attempt: 1, result: 'uncertain' });

    const unchanged = await record(file, { attempt: 1, result: 'uncertain' });

    expect(unchanged.status).toEqual('rescanning');
    expect(unchanged.version).toEqual((await read(file)).version);
    expect(scanner.requestScan).toHaveBeenCalledTimes(3);
    expect(scanner.requestScan).toHaveBeenLastCalledWith(
      {},
      { file: expect.objectContaining({ id: file.id }), attempt: 2 },
    );
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('recovers a refused rescan request when the message is redelivered, without rejecting the file', async () => {
    const file = await uploadedFile();
    scanner.requestScan.mockRejectedValueOnce(new Error('queue down'));

    await expect(
      record(file, { attempt: 1, result: 'uncertain' }),
    ).rejects.toThrow(FileScanRequestException);
    expect((await read(file)).status).toEqual('rescanning');

    // The queue redelivers the message whose handling threw.
    await record(file, { attempt: 1, result: 'uncertain' });

    // Confirm's request, the refused rescan, and the rescan sent again.
    expect(scanner.requestScan).toHaveBeenCalledTimes(3);
    expect(scanner.requestScan).toHaveBeenLastCalledWith(
      {},
      { file: expect.objectContaining({ id: file.id }), attempt: 2 },
    );
    expect((await read(file)).status).toEqual('rescanning');
    expect(storage.delete).not.toHaveBeenCalled();

    const passed = await record(file, { attempt: 2, result: 'clean' });

    expect(passed.status).toEqual('active');
  });

  it('sends a refused first request again from a sweep, and the file passes', async () => {
    scanner.requestScan.mockRejectedValueOnce(new Error('queue down'));
    const file = await uploadedFile();
    expect((await read(file)).status).toEqual('scanning');

    const waiting = await commandBus.execute(
      new RequestFileScanCommand({}, file.id),
    );

    expect(waiting.status).toEqual('scanning');
    expect(scanner.requestScan).toHaveBeenCalledTimes(2);
    expect(scanner.requestScan).toHaveBeenLastCalledWith(
      {},
      { file: expect.objectContaining({ id: file.id }), attempt: 1 },
    );

    const passed = await record(file, { attempt: 1, result: 'clean' });

    expect(passed.status).toEqual('active');
  });

  it('sends no request for a file no longer waiting on a scan', async () => {
    const file = await uploadedFile();
    await record(file, { attempt: 1, result: 'clean' });

    const active = await commandBus.execute(
      new RequestFileScanCommand({}, file.id),
    );

    expect(active.status).toEqual('active');
    expect(scanner.requestScan).toHaveBeenCalledTimes(1);
  });

  it('keeps the record of a rejected file: removing it is refused', async () => {
    const file = await uploadedFile();
    await record(file, { attempt: 1, result: 'infected' });

    await expect(
      commandBus.execute(new RemoveFileCommand({}, file.id)),
    ).rejects.toThrow(FileStatusException);
    expect((await read(file)).status).toEqual('rejected');
    expect(storage.delete).toHaveBeenCalledTimes(1);
  });

  it('ignores a result for a file that has passed', async () => {
    const file = await uploadedFile();
    await record(file, { attempt: 1, result: 'clean' });

    const unchanged = await record(file, { attempt: 1, result: 'infected' });

    expect(unchanged.status).toEqual('active');
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('leaves a file rejecting when storage fails to delete it, and a repeated result finishes', async () => {
    const file = await uploadedFile();
    storage.delete.mockRejectedValueOnce(new Error('denied'));

    await expect(
      record(file, { attempt: 1, result: 'infected' }),
    ).rejects.toThrow(FileRejectException);
    expect((await read(file)).status).toEqual('rejecting');
    // Announced once rejecting committed, before the delete failed.
    expect(events.some((event) => event instanceof FileRejectedEvent)).toBe(
      true,
    );

    const rejected = await record(file, { attempt: 1, result: 'infected' });

    expect(rejected.status).toEqual('rejected');
    expect(storage.delete).toHaveBeenCalledTimes(2);
  });

  it('refuses a result recorded inside a transaction', async () => {
    const file = await uploadedFile();

    await expect(
      app.get(TransactionScope).run({}, (txCtx) =>
        commandBus.execute(
          new RecordFileScanResultCommand(txCtx, file.id, {
            attempt: 1,
            result: 'infected',
          }),
        ),
      ),
    ).rejects.toThrow(FileScanResultInTransactionException);
    expect((await read(file)).status).toEqual('scanning');
    expect(storage.delete).not.toHaveBeenCalled();
  });
});
