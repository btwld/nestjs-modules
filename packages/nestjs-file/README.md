# @concepta/nestjs-file

File records for NestJS using DDD/CQRS. You plug in one storage service per
backend (S3, a filesystem, ...); the module keeps a row per file, hands out
upload and download URLs, and tracks each file from upload to removal.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-file)](https://www.npmjs.com/package/@concepta/nestjs-file)
[![NPM Downloads](https://img.shields.io/npm/dw/@concepta/nestjs-file)](https://www.npmjs.com/package/@concepta/nestjs-file)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/peer/@nestjs/common/feature/version-8?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-file%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

- [Installation](#installation)
- [Module Registration](#module-registration)
- [Storage Services](#storage-services)
- [File Lifecycle](#file-lifecycle)
- [The File Aggregate](#the-file-aggregate)
- [Commands](#commands)
- [Queries](#queries)
- [Domain Events](#domain-events)
- [Referring to a File](#referring-to-a-file)
- [Writing a Controller](#writing-a-controller)
- [Repository](#repository)
- [Schemas](#schemas)
- [Exceptions](#exceptions)
- [Entry Points](#entry-points)
- [Seeding](#seeding)
- [Environment Variables](#environment-variables)

## Installation

```sh
yarn add @concepta/nestjs-file @concepta/nestjs-core @concepta/nestjs-repository \
  @nestjs/common @nestjs/config @nestjs/core @nestjs/cqrs rxjs
```

With TypeORM, as in [Module Registration](#module-registration), also add:

```sh
yarn add @concepta/nestjs-repository-typeorm @nestjs/typeorm typeorm
```

This package is ESM-only and requires Node.js >= 22.12 and NestJS 12.

### Peer Dependencies

| Package | Required | Notes |
| --- | --- | --- |
| `@nestjs/common` | Yes | NestJS 12 framework |
| `@nestjs/core` | Yes | Module reference and reflection |
| `@nestjs/config` | Yes | Settings/config loading |
| `@nestjs/cqrs` | No | Optional peer — required in practice for `CommandBus`, `QueryBus`, `EventBus` |
| `rxjs` | Yes | Required by NestJS |
| `typeorm` | No | Only if using the TypeORM repository adapter |
| `@concepta/typeorm-seeding` | No | Only for database seeding |
| `@faker-js/faker` | No | Only for database seeding |

## Module Registration

Extend one of the abstract entities, register it with `RepositoryModule`, then
register `FileModule` with your storage services:

```ts
import { Entity } from 'typeorm';
import { FileSqliteEntity } from '@concepta/nestjs-file/optional/typeorm';

@Entity()
export class FileEntity extends FileSqliteEntity {}
```

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoreModule } from '@concepta/nestjs-core';
import { FileModule } from '@concepta/nestjs-file';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

@Module({
  imports: [
    CoreModule.forRoot(),
    TypeOrmModule.forRoot({ /* ... */ entities: [FileEntity] }),
    RepositoryModule.forRoot({
      drivers: [
        {
          driver: TypeOrmRepositoryModule,
          entities: [{ key: 'file', entity: FileEntity }],
        },
      ],
    }),
    FileModule.forRootAsync({
      imports: [S3Module],
      inject: [S3StorageService],
      useFactory: (s3: S3StorageService) => ({ storageServices: [s3] }),
      entities: { file: 'file' },
    }),
  ],
})
export class AppModule {}
```

Use `forRoot({ storageServices: [...] })` when the services need no injection.

### Options

| Option | Where | Notes |
| --- | --- | --- |
| `storageServices` | options | One per `KEY`. Required. |
| `entities.file` | extras | The entity key registered with `RepositoryModule`. Defaults to `'file'`. |
| `repositories.file` | extras | A `FileRepository` subclass to use instead; see [Repository](#repository). |
| `providers` | extras | Extra providers; the last provider for a token wins. |
| `global` | extras | Set by `forRoot`/`forRootAsync`. |

The file entity is mutable: if your deployment requires a write policy on
every entity, register it with `writePolicy: { access: 'mutable' }`. It needs
no other repository opt-ins.

## Storage Services

A storage service implements `FileStorageServiceInterface`. A file uses the
service whose `KEY` equals its `serviceKey`.

```ts
import { Injectable, type PlainLiteralObject } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  type FileInterface,
  type FileStorageServiceInterface,
} from '@concepta/nestjs-file';

@Injectable()
export class S3StorageService implements FileStorageServiceInterface {
  KEY = 's3';

  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  getSignedUploadUrl(_ctx: PlainLiteralObject, file: FileInterface) {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: file.fileName,
        ContentType: file.contentType,
      }),
    );
  }

  getSignedDownloadUrl(_ctx: PlainLiteralObject, file: FileInterface) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: file.fileName }),
    );
  }

  async exists(_ctx: PlainLiteralObject, file: FileInterface) {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: file.fileName }),
      );
      return true;
    } catch (error) {
      if (error instanceof NotFound) return false;
      throw error;
    }
  }

  async delete(_ctx: PlainLiteralObject, file: FileInterface) {
    // S3 deletes are idempotent: deleting a missing key succeeds.
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: file.fileName }),
    );
  }
}
```

`getSignedUploadUrl` and `getSignedDownloadUrl` are required and return
signed, expiring URLs the client uses directly. The upload URL is asked for
only when a file is created. `exists` and `delete` are optional, and leaving
one out is how you choose the behaviour:

- **No `exists`:** confirming an upload doesn't check storage.
- **No `delete`:** removing a file deletes only its row and keeps the object.

`delete` must be idempotent: resolve when the object is already gone. A
removal that is retried after a crash calls it again for an object it already
deleted.

Every method receives the caller's `ctx` first, so a tenant-aware service can
pick a bucket or prefix from it.

## File Lifecycle

| Status | What it means for you |
| --- | --- |
| `pending` | Created. Upload to `signedUploadUrl`, then confirm. |
| `active` | Confirmed and ready to download. |
| `removing` | A removal is running, or was interrupted. The file stays readable until it's gone. Remove it again to finish. |
| `remove-failed` | A removal didn't finish: storage couldn't delete the object, or the file was restored while its object was being deleted. Remove the file again to retry. |

**Soft delete** a `pending` or `active` file to hide it from reads while
keeping the stored object; **restore** it to bring it back. Its name stays
taken until you remove it. A soft-deleted file can't change, so it keeps its
status until it's restored or removed.

**Remove** a file to delete the stored object and then its record. If storage
fails, you get `FileRemoveException`; dispatch `RemoveFileCommand` again to
retry. A live file is left `remove-failed`, so its record never points at a
deleted object without its status saying so. A soft-deleted file is left as
it was, still hidden. Once a removal of a soft-deleted file has failed, remove
it again rather than restore it: its object may already be gone.

If two commands change the same file at once, the later one fails with
`OptimisticLockException` instead of overwriting the first; retry it.

## The File Aggregate

Commands and queries hand you a `File`:

| Member | What you get |
| --- | --- |
| `id`, `version` | The record's id, and the version each write is checked against. |
| `serviceKey`, `fileName`, `contentType` | What you created it with. |
| `status` | `pending`, `active`, `removing` or `remove-failed`. |
| `isSoftDeleted` | Whether it's soft-deleted. |
| `isInUse` | Whether it's `pending` or `active` and not soft-deleted. |
| `isUploadConfirmed` | Whether the upload is confirmed (`active`). |
| `meta` | `dateCreated`, `dateUpdated`, `dateDeleted`. |
| `toPlain()` | The whole record as a plain object, to return from a controller. |

Change a file only through the commands; they apply the rules and write it.

## Commands

| Command | Returns | Does |
| --- | --- | --- |
| `CreateFileCommand(ctx, { serviceKey, fileName, contentType })` | `FileCreatedResultInterface` | Creates a `pending` file. Throws `FileAlreadyExistsException` when the name is taken, by a soft-deleted file too. |
| `ConfirmFileUploadCommand(ctx, id)` | `FileReadResultInterface` | Marks the upload done, after checking storage if your service implements `exists`. Confirming twice returns the file unchanged. |
| `SoftDeleteFileCommand(ctx, id)` | `File` | Hides the file from reads and returns it, soft-deleted. |
| `RestoreFileCommand(ctx, id)` | `File` | Brings a soft-deleted file back. Restoring a file that isn't soft-deleted returns it unchanged. |
| `RemoveFileCommand(ctx, id)` | `File` | Deletes the stored object and the file (see [File Lifecycle](#file-lifecycle)). |

| Result | Properties |
| --- | --- |
| `FileCreatedResultInterface` | `file`, `signedUploadUrl`, `signedDownloadUrl` |
| `FileReadResultInterface` | `file`, `signedDownloadUrl` |

Create is the only command that gives you a `signedUploadUrl`; confirm and
reads give you `signedDownloadUrl`. If storage can't produce a URL, you get
`FileUploadUrlException` or `FileDownloadUrlException`, and a failed create
leaves nothing behind.

Create and confirm wait for your storage service inside a transaction, so keep
those calls fast: past the transaction timeout (30 seconds by default) the
command fails and leaves nothing behind.

Two creates of the same name at the same moment: one wins, and the other can
fail with `RepositoryDatabaseException` instead of
`FileAlreadyExistsException`. Treat both as "name taken".

**Dispatch `RemoveFileCommand` outside any transaction**, including the
transactional interceptor; inside one it throws
`FileRemoveInTransactionException`.

```ts
const { file, signedUploadUrl } = await this.commandBus.execute(
  new CreateFileCommand(ctx, {
    serviceKey: 's3',
    fileName: `avatars/${userId}.png`,
    contentType: 'image/png',
  }),
);
```

## Queries

| Query | Returns |
| --- | --- |
| `GetFileQuery(ctx, id, { status? })` | `FileReadResultInterface`, or throws `FileNotFoundException` |
| `GetFileByKeyQuery(ctx, { serviceKey, fileName }, { status? })` | `File \| null` |

`status` limits the match to those statuses; without it every status matches.
Neither query returns soft-deleted files.

```ts
const { signedDownloadUrl } = await this.queryBus.execute(
  new GetFileQuery(ctx, id, { status: ['active'] }),
);
```

## Domain Events

| Event | Published when |
| --- | --- |
| `FileCreatedEvent` | a file is created |
| `FileUploadConfirmedEvent` | an upload is confirmed |
| `FileSoftDeletedEvent` | a file is soft-deleted |
| `FileRestoredEvent` | a soft-deleted file is restored |
| `FileRemoveFailedEvent` | a removal is recorded as failed (`remove-failed`) |
| `FileRemovedEvent` | the row is deleted, after the object |

Each event carries `eventContext` and the plain `file` as stored, and is
published once the write that produced it commits; a write that rolls back
publishes nothing. A failed removal is the one command that throws and still
publishes: `FileRemoveFailedEvent` goes out once `remove-failed` commits.

## Referring to a File

Give your own entity a `fileId` column and implement `FileOwnableInterface`
(`{ fileId }`) to point at a file, for example a report's output or a user's
avatar.

## Writing a Controller

The module ships no HTTP routes. Write a controller that dispatches the
commands and queries:

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  type PlainLiteralObject,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Ctx } from '@concepta/nestjs-core';
import {
  ConfirmFileUploadCommand,
  CreateFileCommand,
  GetFileQuery,
  RemoveFileCommand,
  RestoreFileCommand,
  SoftDeleteFileCommand,
} from '@concepta/nestjs-file';

@Controller('files')
export class FileController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(
    @Ctx() ctx: PlainLiteralObject,
    @Body() body: { fileName: string; contentType: string },
  ) {
    const { file, signedUploadUrl } = await this.commandBus.execute(
      new CreateFileCommand(ctx, { ...body, serviceKey: 's3' }),
    );
    return { ...file.toPlain(), signedUploadUrl };
  }

  @Put(':id/confirm')
  async confirm(@Ctx() ctx: PlainLiteralObject, @Param('id') id: string) {
    const { file, signedDownloadUrl } = await this.commandBus.execute(
      new ConfirmFileUploadCommand(ctx, id),
    );
    return { ...file.toPlain(), signedDownloadUrl };
  }

  @Get(':id')
  async read(@Ctx() ctx: PlainLiteralObject, @Param('id') id: string) {
    const { file, signedDownloadUrl } = await this.queryBus.execute(
      new GetFileQuery(ctx, id, { status: ['active'] }),
    );
    return { ...file.toPlain(), signedDownloadUrl };
  }

  @Put(':id/soft-delete')
  async softDelete(@Ctx() ctx: PlainLiteralObject, @Param('id') id: string) {
    const file = await this.commandBus.execute(
      new SoftDeleteFileCommand(ctx, id),
    );
    return file.toPlain();
  }

  @Put(':id/restore')
  async restore(@Ctx() ctx: PlainLiteralObject, @Param('id') id: string) {
    const file = await this.commandBus.execute(new RestoreFileCommand(ctx, id));
    return file.toPlain();
  }

  @Delete(':id')
  async remove(@Ctx() ctx: PlainLiteralObject, @Param('id') id: string) {
    await this.commandBus.execute(new RemoveFileCommand(ctx, id));
  }
}
```

`@Ctx()` passes the request's context, so your storage service, hooks and
event listeners see the caller and the request's correlation id.

The client uploads to `signedUploadUrl` directly, then calls
`PUT /files/:id/confirm`. Validate request bodies with `fileCreateSchema`.

To finish interrupted removals, find files in `removing` or `remove-failed`
with your own query on the entity, then dispatch `RemoveFileCommand` for each.
A soft-deleted file has no removal status, so track the ones you mean to
remove yourself and dispatch it again for those. If your sweep catches a
removal that is still running, the later one takes over and the other fails
with `OptimisticLockException`, possibly after its object was already deleted.
Both are safe to retry, and the file ends up removed either way.

## Repository

`FileRepository` implements `FileRepositoryInterface` over the repository
registered for `entities.file`. To change how files are read or written,
extend it and pass the class as `repositories.file`; the module builds it with
the same repository and `FileMapper`, so `this.repository` and `this.mapper`
are there for you:

```ts
import { FileRepository } from '@concepta/nestjs-file';

export class MyFileRepository extends FileRepository {
  // override any method, following the contract on FileRepositoryInterface
}

FileModule.forRoot({
  storageServices: [s3],
  entities: { file: 'file' },
  repositories: { file: MyFileRepository },
});
```

To change how files are created, confirmed, soft-deleted, restored or removed,
provide your own `FileLifecycleService` subclass through `providers`.

## Schemas

| Schema | Shape |
| --- | --- |
| `fileSchema` | A stored file: own columns, `status`, id, version and dates. Named OpenAPI component `File`. |
| `fileCreateSchema` | Create body: non-empty `serviceKey`, `fileName`, `contentType`. |

## Exceptions

| Exception | Fault | When |
| --- | --- | --- |
| `FileNotFoundException` | client | No file matches the id (and status filter). |
| `FileAlreadyExistsException` | client | The key is taken, by a soft-deleted file too. |
| `FileNotUploadedException` | client | `exists` says the object isn't uploaded. |
| `FileStatusException` | client | The status doesn't allow the operation. |
| `FileStorageNotFoundException` | usage | No storage service has the file's `serviceKey`. |
| `FileRemoveInTransactionException` | usage | `RemoveFileCommand` was dispatched inside a transaction. |
| `FileUploadUrlException` | internal | Storage failed to produce an upload URL. |
| `FileDownloadUrlException` | internal | Storage failed to produce a download URL. |
| `FileExistsCheckException` | internal | Storage failed to check whether the object is uploaded. |
| `FileStorageDeleteException` | internal | Storage failed to delete the object. You see it as the `cause` of `FileRemoveException`. |
| `FileRemoveException` | internal | Storage failed to delete the object. A live file is `remove-failed`, unless `context.statusError` says that couldn't be recorded either; a soft-deleted file is left as it was. Remove it again to retry. |

All extend `FileException`. For the `internal` ones, the storage error is the
exception's `cause`; for `FileRemoveException` it is one level down, on the
`FileStorageDeleteException` that is its `cause`.

## Entry Points

| Import Path | Contents |
| --- | --- |
| `@concepta/nestjs-file` | Module, aggregate, commands, queries, handlers, events, `FileStorageService`, `FileLifecycleService`, repository, schemas, exceptions, domain and config interfaces |
| `@concepta/nestjs-file/optional/typeorm` | `FileSqliteEntity`, `FilePostgresEntity` |
| `@concepta/nestjs-file/optional/seeding` | `FileFactory` |

## Seeding

`FileFactory` seeds `active` files with `serviceKey` `'default'`. Override
`serviceKey` to one of your storage services:

```ts
import { FileFactory } from '@concepta/nestjs-file/optional/seeding';
```

## Environment Variables

None. Everything is configured through the module options.
