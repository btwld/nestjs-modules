# Rockets NestJS Report Manager

Manage reports for several components using one module.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-report)](https://www.npmjs.com/package/@concepta/nestjs-report)
[![NPM Downloads](https://img.shields.io/npm/dw/@conceptadev/nestjs-report)](https://www.npmjs.com/package/@concepta/nestjs-report)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/@nestjs/common?label=NestJS&logo=nestjs&reportname=packages%2Fnestjs-core%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

1. [Tutorial](#tutorial)
   - [Step 1: Install Dependencies](#step-1-install-dependencies)
   - [Step 2: Create DTOs](#step-2-create-dtos)
   - [Step 3: Define Constants](#step-3-define-constants)
   - [Step 4: Create the Report Generator Service](#step-4-create-the-report-generator-service)
   - [Step 5: Create the Controller](#step-5-create-the-controller)
   - [Step 6: Register the Module](#step-6-register-the-module)
   - [Step 7: Setup AppModule](#step-7-setup-appmodule)
   - [Testing User Report Generation with cURL](#testing-user-report-generation-with-curl)
   - [Conclusion](#conclusion)
2. [How to Guide for Reports](#how-to-guide-for-reports)
   - [1. How to Create a New Report Generator Service](#1-how-to-create-a-new-report-generator-service)
   - [2. How to Integrate a New Storage Service](#2-how-to-integrate-a-new-storage-service)
   - [3. How to Integrate with Multiple Storage Services](#3-how-to-integrate-with-multiple-storage-services)
3. [Reference](#reference)
4. [Explanation](#explanation)
   - [Abstraction and Flexibility](#abstraction-and-flexibility)
   - [Seamless Integration with File Module](#seamless-integration-with-file-module)
   - [Easy Customization and Extensibility](#easy-customization-and-extensibility)
   - [Standardized Report Handling](#standardized-report-handling)
   - [Asynchronous Report Generation](#asynchronous-report-generation)
   - [Centralized Report Management](#centralized-report-management)
   - [TypeORM Integration](#typeorm-integration)
   - [Nestjs Ecosystem Compatibility](#nestjs-ecosystem-compatibility)

## Tutorial

This tutorial will guide you through the steps to implement and use the
`nestjs-report` module in your NestJS project. We will use the
`user-report` module as an example.

### Step 1: Install Dependencies

First, you need to install the necessary dependencies. Run the
following command:

```bash
npm install @concepta/nestjs-report @concepta/nestjs-common @nestjs/swagger axios
```

### Step 2: Create DTOs

Create a Data Transfer Object (DTO) for the report. This will define the
structure of the data that will be sent to and from the API.

```typescript
// dto/user-report.dto.ts
import { ReportCreateDto } from '@concepta/nestjs-report';
import { PickType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

@Exclude()
export class UserReportCreateDto extends PickType(ReportCreateDto, [
  'name',
] as const) {}
```

### Step 3: Define Constants

Define any constants that will be used throughout the module.
For example, you might have constants for service keys, URLs, etc.

```typescript
// user-report.constants.ts
export const AWS_KEY_FIXTURE = 'my-aws';
export const REPORT_KEY_USER_REPORT = 'user-report';
export const REPORT_SHORT_DELAY_KEY_FIXTURE = 'my-report-short-delay';
export const DOWNLOAD_URL_FIXTURE = 'https://aws-storage.com/downloaded';
export const UPLOAD_URL_FIXTURE = 'https://aws-storage.com/upload';
export const REPORT_NAME_FIXTURE = 'test.pdf';
```

### Step 4: Create the Report Generator Service

Create a service that implements the `ReportGeneratorServiceInterface`.
This service will handle the generation of reports.

```typescript
import { FileEntityInterface, FileService } from '@concepta/nestjs-file';
import {
  ReportGeneratorResultInterface,
  ReportGeneratorServiceInterface,
} from '@concepta/nestjs-report';
import { ReportStatusEnum } from '@concepta/nestjs-common';
import { Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import { promises as fs } from 'fs';
import { ReportEntity } from '../entities/report.entity';
import { REPORT_KEY_USER_REPORT } from './user-report.constants';

@Injectable()
export class UserReportGeneratorService
  implements ReportGeneratorServiceInterface
{
  readonly KEY: string = REPORT_KEY_USER_REPORT;
  readonly generateTimeout: number = 60000;

  constructor(
    @Inject(FileService)
    private readonly fileService: FileService,
  ) {}

  async getDownloadUrl(report: ReportEntity): Promise<string> {
    if (!report?.file?.id) return '';
    const file = await this.fileService.fetch({ id: report.file.id });
    return file.downloadUrl || '';
  }

  async generate(
    report: ReportEntity,
  ): Promise<ReportGeneratorResultInterface> {
    try {
      const file = await this.pushFileMetadata(report);
      const tempFilePath = await this.createTempFile(report);
      await this.uploadFileContent(file.uploadUri, tempFilePath);
      await this.cleanupTempFile(tempFilePath);

      return this.createSuccessResult(report, file);
    } catch (error) {
      console.error('Error generating report:', error);
      return this.createErrorResult(report, error);
    }
  }

  private async pushFileMetadata(
    report: ReportEntity,
  ): Promise<FileEntityInterface> {
    return this.fileService.push({
      fileName: report.name,
      contentType: 'text/plain',
      serviceKey: 'aws-storage',
    });
  }

  private async createTempFile(report: ReportEntity): Promise<string> {
    const tempFilePath = `/tmp/${report.name}.txt`;
    await fs.writeFile(tempFilePath, `User: fake username`);
    return tempFilePath;
  }

  private async uploadFileContent(
    uploadUrl: string,
    filePath: string,
  ): Promise<void> {
    const fileContent = await fs.readFile(filePath);
    await axios.put(uploadUrl, fileContent, {
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  private async cleanupTempFile(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }

  private createSuccessResult(
    report: ReportEntity,
    file: FileEntityInterface,
  ): ReportGeneratorResultInterface {
    return {
      id: report.id,
      status: ReportStatusEnum.Complete,
      file,
    } as ReportGeneratorResultInterface;
  }

  private createErrorResult(
    report: ReportEntity,
    error: Error,
  ): ReportGeneratorResultInterface {
    return {
      id: report.id,
      status: ReportStatusEnum.Error,
      file: null,
      errorMessage: error.message,
    } as ReportGeneratorResultInterface;
  }
}
```

### Step 5: Create the Controller

Create a controller to handle HTTP requests related to the user reports.
This controller will use the `ReportService` to create and fetch reports.

```typescript
import { ReportService } from '@concepta/nestjs-report';
import { ReportInterface, ReportStatusEnum } from '@concepta/nestjs-common';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { REPORT_KEY_USER_REPORT } from './user-report.constants';
import { UserReportCreateDto } from './dto/user-report.dto';

@Controller('user-report')
@ApiTags('user-report')
export class UserController {
  constructor(private reportService: ReportService) {}

  @Post('')
  @ApiResponse({
    description: 'Create a report and return upload and download url',
  })
  async create(@Body() dto: UserReportCreateDto): Promise<ReportInterface> {
    return this.reportService.generate({
      name: dto.name,
      status: ReportStatusEnum.Processing,
      serviceKey: REPORT_KEY_USER_REPORT,
    });
  }

  @Get(':id')
  @ApiResponse({
    description: 'Get report created',
  })
  async get(@Param('id') id: string): Promise<ReportInterface> {
    return this.reportService.fetch({
      id,
    });
  }
}
```

### Step 6: Register the Module

Finally, register the `user-report` module in your NestJS application.
This step typically involves creating a module file and importing necessary
services and controllers.

```typescript
import { Module } from '@nestjs/common';
import { UserController } from './user-report.controller';
import { UserReportGeneratorService } from './user-report-generator.service';
import { ReportService } from '@concepta/nestjs-report';

@Module({
  controllers: [UserController],
  providers: [UserReportGeneratorService, ReportService],
})
export class UserReportModule {}
```

### Step 7: Setup `AppModule`

Update your `AppModule` to include the `UserReportModule` and configure
the `ReportModule` and `FileModule` as dependencies.

```typescript
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';
import { FileModule } from '@concepta/nestjs-file';
import { ReportModule } from '@concepta/nestjs-report';
import { awsConfig } from './config/aws.config';
import { AwsModule } from './aws/aws.module';
import { AwsStorageService } from './aws/aws-storage.service';
import { UserReportModule } from './user-report/user-report.module';
import { UserReportGeneratorService } from './user-report/user-report-generator.service';
import { FileEntity } from './entities/file.entity';
import { ReportEntity } from './entities/report.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [awsConfig],
    }),
    TypeOrmExtModule.forRoot({
        type: 'sqlite',
        database: ':memory:',
        synchronize: true,
        entities: [FileEntity, ReportEntity],
      }),
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
    ReportModule.forRootAsync({
      imports: [UserReportModule],
      inject: [UserReportGeneratorService],
      useFactory: (
        userReportGeneratorService: UserReportGeneratorService,
      ) => ({
        reportGeneratorServices: [userReportGeneratorService],
      }),
      entities: {
        report: {
          entity: ReportEntity,
        },
      },
    }),
  ],
})
export class AppModule {}
```

### Testing User Report Generation with cURL

To test the user report generation functionality using cURL,
follow these steps:

- Create a new user report:

   ```bash
   curl -X POST http://localhost:3000/user-report \
   -H "Content-Type: application/json" \
   -d '{"name": "Test User Report"}'
   ```

   This will return a JSON response with the created report details,
   including its ID and status.

- Check the status of the report using the ID returned from step 1:

  ```bash
  curl -X GET http://localhost:3000/user-report/{reportId}
  ```

  Replace `{reportId}` with the actual ID returned from step 1.

  This will return the report details, including its current status.
  The status will initially be "Processing" and should change to "Complete"
  once the report generation is finished.

- Keep checking the status periodically until it changes to "Complete".
Once complete, the response will include the file information with
download URL.

These steps allow you to test the user report generation process from
creation to retrieval using cURL commands.

### Conclusion

By following these steps, you have successfully integrated the
`nestjs-report` module into your NestJS project. You can now create
and fetch reports using the provided endpoints.

Feel free to customize the services and controllers as per your application's
requirements. Happy coding!

## How to Guide for Reports

### 1. How to Create a New Report Generator Service

To create a new report generator service, you need to implement the
`ReportGeneratorServiceInterface`. Here's a step-by-step guide:

- Create a new file for your report generator service
(e.g., `my-report-generator.service.ts`).
- Import the necessary interfaces and implement the
`ReportGeneratorServiceInterface`.
- Implement the required method: `generate`.
- Define the key for the report generator service.

Here's an example of a custom report generator service:

```ts
export class MyReportGeneratorService
  implements ReportGeneratorServiceInterface
{
  constructor() {}

  KEY: string = 'my-report-generator';
  generateTimeout: number = 60000;

  async getDownloadUrl(report: ReportInterface): Promise<string> {
   // logic to get download url for the report
  }

  async generate(
    report: ReportInterface,
  ): Promise<ReportGeneratorResultInterface> {
   // logic to generate report
  }
}

```

### 2. How to Integrate a New Storage Service

To integrate a new storage service into the `ReportModule`, follow these steps:

1. Import the new storage service module into your `AppModule`.
1. Configure the `ReportModule` with the new storage service.

Here's an example of how to integrate the `MyStorageService` into the
`ReportModule`:

```ts
ReportModule.forRoot({
  reportGeneratorServices: [new MyReportGeneratorService()],
  entities: {
    report: {
      entity: ReportEntityFixture,
    },
  },
}),
```

### 3. How to Integrate with Multiple Storage Services

To integrate with multiple storage services, you can pass an array of
services to the `ReportModule`.

```ts
ReportModule.forRoot({
  reportGeneratorServices: [
    new MyReportGeneratorService(), 
    new MySecondReportGeneratorService()
  ],
  entities: {
    report: {
      entity: ReportEntityFixture,
    },
  },
}),
```

```ts
// to access MyReportGeneratorService
this.reportService.generate({
  name: dto.name,
  status: ReportStatusEnum.Processing,
  serviceKey: 'my-report-generator',
});
// ... 
```

## Reference

For detailed API documentation, please refer to our
[API Reference](https://www.rockets.tools/reference/rockets/nestjs-report/README).
This comprehensive guide provides in-depth information about all available
methods, interfaces, and configurations for the `@concepta/nestjs-report`
package.

## Explanation

The `@concepta/nestjs-report` module offers several significant benefits:

### Abstraction and Flexibility

- Provides high-level abstraction for working with reports
- Allows easy switching between different report generation services
- Enables addition of new services without affecting the rest of the application
- Simplifies implementation of custom report generation services

### Seamless Integration with File Module

- Works harmoniously with @concepta/nestjs-file module
- Enables efficient handling of report files (storage, retrieval, management)
- Leverages file module capabilities for cohesive system architecture

### Easy Customization and Extensibility

- Straightforward implementation of custom report generation services
- Allows integration with various reporting tools or libraries
- Extensible design accommodates diverse reporting needs

### Standardized Report Handling

- Offers consistent interface for working with reports across services
- Simplifies development process and improves code maintainability
- Enhances codebase understandability through standardization

### Asynchronous Report Generation

- Built-in support for handling long-running report creation tasks
- Improves overall application performance and user experience
- Efficiently manages resource-intensive reporting processes

### Centralized Report Management

- Promotes better organization of code and separation of concerns
- Simplifies management, updates, and maintenance of report functionality
- Centralizes report-related operations for improved code structure

### TypeORM Integration

- Enables easy persistence and retrieval of report metadata
- Facilitates efficient tracking and management of report statuses
- Seamlessly integrates with TypeORM for data management

### Nestjs Ecosystem Compatibility

- Designed to work seamlessly with other Nestjs modules
- Follows Nestjs best practices for consistency and ease of use
- Ensures smooth integration within the broader Nestjs ecosystem

By offering these features, the @concepta/nestjs-report module significantly
simplifies report generation and management in Nestjs applications. It provides
a robust, flexible solution for various reporting needs, enhancing developer
productivity and application performance.
