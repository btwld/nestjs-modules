# Rockets NestJS File Manager

Manage files for several components using one module.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-file)](https://www.npmjs.com/package/@concepta/nestjs-file)
[![NPM Downloads](https://img.shields.io/npm/dw/@conceptadev/nestjs-file)](https://www.npmjs.com/package/@concepta/nestjs-file)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/@nestjs/common?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-core%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

1. [Tutorial](#tutorial)
   1. [Integrating AWS with FileModule in NestJS](#integrating-aws-with-filemodule-in-nestjs)
      - [Step 1: Install Required Packages](#step-1-install-required-packages)
      - [Step 2: Configure AWS](#step-2-configure-aws)
      - [Step 3: Create AWS Storage Service](#step-3-create-aws-storage-service)
1. [How to Guide](#how-to-guide)
   1. [How to Create a New Storage Service](#1-how-to-create-a-new-storage-service)
   1. [How to Integrate a New Storage Service](#2-how-to-integrate-a-new-storage-service)
   1. [How to Integrate with Multiple Storage Services](#3-how-to-integrate-with-multiple-storage-services)
   1. [How to create a new File Entity](#4-how-to-create-a-new-file-entity)
1. [Reference](#reference)
1. [Explanation](#explanation)
   1. [Advantages of a Generic File Module](#advantages-of-a-generic-file-module)
   1. [Multiple Storage Services](#multiple-storage-services)
   1. [Ease of Creating New File Module Structures](#ease-of-creating-new-file-module-structures)

## Tutorial

### Integrating AWS with FileModule in NestJS

This guide will walk you through the steps to integrate AWS S3 storage with
the `FileModule` in your NestJS application. This integration allows you to
upload and download files using AWS S3.

#### Step 1: Install Required Packages

First, ensure you have the necessary packages installed. You will need
`@aws-sdk/client-s3` and `@nestjs/config`.

```bash
yarn add @concepta/nestjs-file @aws-sdk/client-s3 @nestjs/config
```

#### Step 2: Configure AWS

Create a configuration file for AWS in your `config` directory.

```ts
// config/aws.config.ts
import { registerAs } from '@nestjs/config';
import { AwsConfigInterface } from '../aws/interfaces/aws.config.interface';

export const awsConfig = registerAs('aws', (): AwsConfigInterface => ({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  bucketName: process.env.AWS_BUCKET_NAME,
}));
```

#### Step 3: Create AWS Storage Service

Implement the AWS storage service that implements the
`FileStorageServiceInterface` that will handle file uploads and downloads.

```ts
// aws/aws-storage.service.ts
import {
  FileCreateDto,
  FileStorageServiceInterface,
} from '@concepta/nestjs-file';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject } from '@nestjs/common';
import { awsConfig } from '../config/aws.config';
import { ConfigType } from '@nestjs/config';

export class AwsStorageService implements FileStorageServiceInterface {
  KEY = 'aws-storage';

  private s3Client: S3Client;
  private bucketName: string;

  constructor(
    @Inject(awsConfig.KEY)
    private config: ConfigType<typeof awsConfig>,
  ) {
    this.s3Client = new S3Client(config);
    this.bucketName = config.bucketName;
  }

  async getUploadUrl(file: FileCreateDto): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: file.fileName,
      ContentType: file.contentType,
    });

    return await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600,
    });
  }

  async getDownloadUrl(file: FileCreateDto): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: file.fileName,
    });

    return await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600,
    }); // URL expires in 1 hour
  }
}
```

#### Step 4: Create AWS Module

Create an AWS module to provide the AWS storage service.

```ts
// aws/aws.module.ts
import { Module } from '@nestjs/common';
import { AwsStorageService } from './aws-storage.service';
import { AwsController } from './aws.controller';

@Module({
  providers: [AwsStorageService],
  exports: [AwsStorageService],
  controllers: [AwsController],
})
export class AwsModule {}
```

#### Step 5: Create entity AWS DTO

Define Entity and Data Transfer Object (DTO) for AWS file operations.

```ts
import { FilePostgresEntity } from '@concepta/nestjs-file';
import { Entity } from 'typeorm';

@Entity('file')
export class FileEntity extends FilePostgresEntity {}

```

```ts
// aws/dto/aws.dto.ts
import { FileCreateDto } from '@concepta/nestjs-file';
import { PickType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

@Exclude()
export class AwsCreateDto extends PickType(FileCreateDto, [
  'fileName',
  'contentType',
] as const) {}
```

#### Step 6: Create AWS Controller

Create a controller to handle AWS file operations.

```ts
// aws/aws.controller.ts
import { FileEntityInterface, FileService } from '@concepta/nestjs-file';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { AwsCreateDto } from './dto/aws.dto';

@Controller('aws')
@ApiTags('aws')
export class AwsController {
  constructor(private fileService: FileService) {}

  @Post('')
  @ApiResponse({
    description: 'Create a file and return upload and download url',
  })
  async create(@Body() fileDto: AwsCreateDto): Promise<FileEntityInterface> {
    return this.fileService.push({
      ...fileDto,
      serviceKey: 'aws-storage',
    });
  }

  @Get('')
  @ApiResponse({
    description: 'Get file created',
  })
  async get(fileId: string): Promise<FileEntityInterface> {
    return this.fileService.fetch({
      id: fileId,
    });
  }
}
```

#### Step 7: Integrate AWS with FileModule

Finally, integrate the AWS module with the `FileModule` in your `AppModule`.

```ts
// app.module.ts
    FileModule.forRootAsync({
      imports: [AwsModule],
      inject: [AwsStorageService],
      useFactory: (awsStorageService: AwsStorageService) => ({
        storageServices: [awsStorageService],
      }),
      entities: {
        file: {
          entity: FileEntity,
        },
      },
    }),
```

#### Step 8: Environment Variables

Ensure you have the following environment variables set in your `.env` file:

```ts
env
AWS_REGION=your-aws-region
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_BUCKET_NAME=your-bucket-name
```

### Uploading a file using curl

After setting up the AWS integration with the `FileModule`, you can use the
provided endpoints to upload files. Here's a step-by-step guide on how to
upload a file using curl:

- First, get a pre-signed URL for file upload:

   ```bash
   curl -X POST http://localhost:3000/aws \
   -H "Content-Type: application/json" \
   -d '{"fileName": "example.txt", "contentType": "text/plain"}'
   ```

   This will return a JSON response with the pre-signed URL:

  ```json
  {
    "serviceKey": "aws-storage",
    "fileName": "image_3.png",
    "contentType": "image/png",
    "dateCreated": "2024-10-01T17:56:07.420Z",
    "dateUpdated": "2024-10-01T17:56:07.420Z",
    "dateDeleted": null,
    "version": 1,
    "id": "1ef0d299-997d-409e-9ce1-dcc8fe3a280e",
    "uploadUri": "<https://your-bucket-name.s3.amazonaws.com/example.txt>?...",
    "downloadUrl": "<https://your-bucket-name.s3.amazonaws.com/example.txt>?.."
  }
  ```

- Use the pre-signed URL to upload the file:

   ```bash
   curl -X PUT -T /path/to/your/example.txt \
   -H "Content-Type: text/plain" \
   "https://your-bucket-name.s3.amazonaws.com/example.txt?AWSAccessKeyId=..."
   ```

   Replace `/path/to/your/example.txt` with the actual path to your file, and
   use the full URL returned from step 1.

- After successful upload, you can use the file ID to retrieve the file
information:

  ```bash
  curl -X GET http://localhost:3000/aws/{fileId}
  ```

   Replace `{fileId}` with the actual file ID returned when you created the
   file record.

- To get a download URL for the file:

   ```bash
   curl -X GET http://localhost:3000/aws/download-url/{fileId}
   ```

   This will return a JSON response with the download URL:

   ```json
   {
     //...
     "downloadUrl": "https://your-bucket-name.s3.amazonaws.com/example.txt?AWSAccessKeyId=..."
   }
   ```

By following these steps, you can upload a file to your AWS S3 bucket using the
pre-signed URLs generated by your NestJS application.

### Conclusion

You have now integrated AWS S3 with the `FileModule` in your NestJS application.
You can use the endpoints defined in the `AwsController` to upload and download
files from your S3 bucket.

## How to Guide

### 1. How to Create a New Storage Service

To create a new storage service, you need to implement the
`FileStorageServiceInterface`. Here's a step-by-step guide:

1. Create a new file for your storage service (e.g., `my-storage.service.ts`).
1. Import the necessary interfaces and implement the
`FileStorageServiceInterface`.
1. Implement the required methods: `getUploadUrl` and `getDownloadUrl`.
1. Define the key for the storage service.

Here's an example of a custom storage service:

```ts
import {
  FileCreateDto,
  FileStorageServiceInterface,
} from '@concepta/nestjs-file';
import { Inject } from '@nestjs/common';

export class MyStorageService implements FileStorageServiceInterface {
  KEY = 'my-storage';

  constructor( ) {
    
  }

  async getUploadUrl(file: FileCreateDto): Promise<string> {
    // Implement your logic to generate an upload URL
  }

  async getDownloadUrl(file: FileCreateDto): Promise<string> {
    // Implement your logic to generate a download URL
  }
}
```

### 2. How to Integrate a New Storage Service

To integrate a new storage service into the `FileModule`, follow these steps:

1. Import the new storage service module into your `AppModule`.
1. Configure the `FileModule` with the new storage service.

Here's an example of how to integrate the `MyStorageService` into the
`FileModule`:

```ts
// ...
FileModule.forRoot({
  storageServices: [new MyStorageService],
  // ...
}),
//...
```

### 3. How to Integrate with Multiple Storage Services

Repeat the previous step but define a different key for the storage service.

Here's an example of how to set multiple custom storage service:

```ts
// ...
FileModule.forRoot({
  storageServices: [new MyStorageService(), new MySecondStorageService()],
  // ...
}),
//...
```

```ts
// to access MyStorageService
this.fileService.push({
  ...fileDto,
  serviceKey: 'my-storage',
});
// ... 
```

```ts
// to access MySecondStorageService
this.fileService.push({
  ...fileDto,
  serviceKey: 'my-second-storage',
});
// ... 
```

### 4. How to create a new File Entity

To create a new entity, follow these steps:

1. Create a new file for your entity (e.g., `my-entity.entity.ts`).
1. Extend the `FilePostgresEntity` or `FileMongoEntity` class and add your
custom fields.
1. Register the new entity in the `FileModule`.

Here's an example of a custom entity:

```ts
import { FilePostgresEntity } from '@concepta/nestjs-file';
import { Entity } from 'typeorm';

@Entity('my-entity')
export class MyEntity extends FilePostgresEntity {}
```

```ts
// ...
FileModule.forRootAsync({
  entities: {
    file: {
      entity: MyEntity,
    },
  },
  // ...
}),
// ...
```

## Reference

For detailed API documentation, please refer to our
[API Reference](https://www.rockets.tools/reference/rockets/nestjs-file/README).
This comprehensive guide provides in-depth information about all available
methods, interfaces, and configurations for the `@concepta/nestjs-file`
package.

## Explanation

### Advantages of a Generic File Module

The `@concepta/nestjs-file` module offers a generic, flexible approach to file
handling in NestJS applications. This design provides several key advantages:

1. **Abstraction**: By abstracting file operations, developers can work with
   files without worrying about the underlying storage mechanism. This
   separation of concerns simplifies application logic and improves
   maintainability.

1. **Flexibility**: The module's design allows for easy integration with
   various storage services. Whether using local storage, cloud services like
   AWS S3, Google Cloud Storage, or any custom solution, the module can
   accommodate your needs.

1. **Consistency**: With a standardized interface for file operations, your
   application maintains consistent behavior across different storage services.
   This consistency simplifies development and reduces errors when switching
   between or combining different storage solutions.

1. **Scalability**: As your application grows, you can easily add new storage
   services or switch between them without significant changes to your
   application code. This scalability is crucial for applications that may need
   to adapt to changing requirements or infrastructure.

1. **Testability**: The abstraction layer makes it easier to mock file
   operations in unit tests, allowing for more comprehensive and isolated
   testing of your application logic.

### Multiple Storage Services

Supporting multiple storage services within the same module offers several
benefits:

1. **Versatility**: Different parts of your application may have different
   storage requirements. With support for multiple services, you can use the
   most appropriate storage solution for each use case within a single
   application.

1. **Migration**: If you need to migrate from one storage service to another,
   you can do so gradually by running multiple services in parallel during the
   transition period.

1. **Redundancy**: For critical applications, you can implement redundancy by
   storing files across multiple services simultaneously.

1. **Cost Optimization**: Different storage services have different pricing
   models. By supporting multiple services, you can optimize costs by choosing
   the most cost-effective solution for each type of data or usage pattern.

### Ease of Creating New File Module Structures

The `@concepta/nestjs-file` module is designed with extensibility in mind,
making it straightforward to create new file module structures:

1. **Standardized Interface**: By implementing the
   `FileStorageServiceInterface`, you can easily create new storage services
   that seamlessly integrate with the existing module structure.

1. **Minimal Boilerplate**: The module provides base classes and interfaces
   that handle much of the common functionality, allowing you to focus on the
   specific implementation details of your new storage service.

1. **Plug-and-Play**: Once a new storage service is implemented, it can be
   easily plugged into the existing module configuration without requiring
   changes to other parts of your application.

1. **Customizable Entities**: The module allows for easy creation and
   registration of custom file entities, enabling you to tailor the data model
   to your specific needs while still leveraging the module's core
   functionality.

1. **Dependency Injection**: Leveraging NestJS's dependency injection system,
   new services and entities can be easily integrated and made available
   throughout your application.

This design philosophy ensures that extending the file module to support new
storage services or customize existing functionality is a straightforward
process, promoting adaptability and reducing development time for custom file
handling solutions.
