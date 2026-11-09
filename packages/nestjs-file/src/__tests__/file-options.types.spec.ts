import { type FileStorageServiceInterface } from '../domain/interfaces/file-storage-service.interface.js';
import { FileModule } from '../file.module.js';
import { type FileOptionsInterface } from '../infrastructure/config/interfaces/file-options.interface.js';

import {
  FakeScannedStorageService,
  FakeScanner,
} from './helpers/mock.helpers.js';

// Compile-time checks: a misplaced `@ts-expect-error` fails the type check.
describe('file module options', () => {
  const withoutDelete: FileStorageServiceInterface = {
    KEY: 'keeps-objects',
    getUploadTarget: () => ({ url: 'https://upload.test', method: 'PUT' }),
    getSignedDownloadUrl: () => 'https://download.test',
  };

  it('takes a storage service without delete when nothing scans', () => {
    const options: FileOptionsInterface = { storageServices: [withoutDelete] };

    expect(options.storageServices).toEqual([withoutDelete]);
  });

  it('requires a scanner when the upload policy requires a scan', () => {
    // @ts-expect-error a policy that requires a scan needs a scanner
    const refused: FileOptionsInterface = {
      storageServices: [withoutDelete],
      uploadPolicy: { requireScan: true },
    };
    const accepted: FileOptionsInterface = {
      storageServices: [new FakeScannedStorageService()],
      uploadPolicy: { requireScan: true },
      scanner: new FakeScanner(),
    };
    const notRequired: FileOptionsInterface = {
      storageServices: [withoutDelete],
      uploadPolicy: { requireScan: false, maxSize: 1024 },
    };

    expect([refused, accepted, notRequired]).toHaveLength(3);
  });

  it('requires the scanner through forRoot and forRootAsync too', () => {
    const register = () => [
      // @ts-expect-error a policy that requires a scan needs a scanner
      FileModule.forRoot({
        storageServices: [withoutDelete],
        uploadPolicy: { requireScan: true },
      }),
      FileModule.forRootAsync({
        // @ts-expect-error a policy that requires a scan needs a scanner
        useFactory: () => ({
          storageServices: [withoutDelete],
          uploadPolicy: { requireScan: true },
        }),
      }),
    ];

    expect(register).toBeInstanceOf(Function);
  });

  it('requires delete on every storage service once a scanner is registered', () => {
    // @ts-expect-error a scanner's rejected files must be deletable
    const refused: FileOptionsInterface = {
      storageServices: [withoutDelete],
      scanner: new FakeScanner(),
    };
    const accepted: FileOptionsInterface = {
      storageServices: [new FakeScannedStorageService()],
      scanner: new FakeScanner(),
    };

    expect([refused, accepted]).toHaveLength(2);
  });

  it('requires it through forRoot and forRootAsync too', () => {
    const register = () => [
      // @ts-expect-error a scanner's rejected files must be deletable
      FileModule.forRoot({
        storageServices: [withoutDelete],
        scanner: new FakeScanner(),
      }),
      FileModule.forRootAsync({
        // @ts-expect-error a scanner's rejected files must be deletable
        useFactory: () => ({
          storageServices: [withoutDelete],
          scanner: new FakeScanner(),
        }),
      }),
    ];

    expect(register).toBeInstanceOf(Function);
  });
});
