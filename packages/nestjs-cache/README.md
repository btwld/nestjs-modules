# Rockets NestJS Cache Documentation

The Rockets NestJS Cache module offers a robust caching solution for NestJS
applications, enhancing data management efficiency. It integrates seamlessly
with the NestJS framework, supporting both synchronous and asynchronous
registration of cache configurations. This module enables CRUD operations on
cache entries directly from the database, facilitating data reuse across
different parts of an application or even different applications. It is
especially useful for boosting application performance, reducing database load,
and improving user experience by minimizing data retrieval times.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-auth-local)](https://www.npmjs.com/package/@concepta/nestjs-auth-local)
[![NPM Downloads](https://img.shields.io/npm/dw/@concepta/nestjs-auth-local)](https://www.npmjs.com/package/@concepta/nestjs-auth-local)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/@nestjs/common?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-core%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

- [Tutorials](#tutorials)
  - [Getting Started with Rockets NestJS Cache](#getting-started-with-rockets-nestjs-cache)
    - [Introduction](#introduction)
    - [Installation](#installation)
    - [Basic Setup in a NestJS Project](#basic-setup-in-a-nestjs-project)
    - [Using the RestFull endpoints to access cache](#using-the-restfull-endpoints-to-access-cache)
- [How-to Guides](#how-to-guides)
  - [Registering CacheModule Synchronously](#registering-cachemodule-synchronously)
  - [Registering CacheModule Asynchronously](#registering-cachemodule-asynchronously)
  - [Global Registering CacheModule Asynchronously](#global-registering-cachemodule-asynchronously)
  - [Registering CacheModule Asynchronously for Multiple Entities](#registering-cachemodule-asynchronously-for-multiple-entities)
  - [Using the CacheService to Access Cache](#using-the-cacheservice-to-access-cache)
- [Reference](#reference)
- [Explanation](#explanation)
  - [Conceptual Overview of Caching](#conceptual-overview-of-caching)
    - [What is Caching?](#what-is-caching)
    - [Benefits of Using Cache](#benefits-of-using-cache)
    - [Why Use NestJS Cache?](#why-use-nestjs-cache)
    - [When to Use NestJS Cache](#when-to-use-nestjs-cache)
    - [How CacheOptionsInterface is Used in the Controller and Endpoints](#how-cacheoptionsinterface-is-used-in-the-controller-and-endpoints)
  - [Design Choices in CacheModule](#design-choices-in-cachemodule)
    - [Synchronous vs Asynchronous Registration](#global-vs-synchronous-vs-asynchronous-registration)

## Tutorials

### Getting Started with Rockets NestJS Cache

#### Introduction

The Rockets NestJS Cache module is designed to provide an easy and efficient way
to manage cached data in your application. This tutorial will guide you through
the initial steps to set up and use the Rockets NestJS Cache module.

#### Installation

To install the module, use the following command:

```sh
npm install typeorm
npm install class-transformer
npm install class-validator
npm install @nestjs/typeorm
npm install @concepta/nestjs-crud
npm install @concepta/nestjs-typeorm-ext
npm install @concepta/nestjs-cache

or

yarn add typeorm 
yarn add class-transformer
yarn add class-validator
yarn add @nestjs/typeorm
yarn add @concepta/nestjs-crud
yarn add @concepta/nestjs-typeorm-ext
yarn add @concepta/nestjs-cache
```

On this documentation we will use `sqlite3` as database, but you can use
whatever you want

```sh
yarn add sqlite3
```

#### Basic Setup in a NestJS Project

1. **User Module**: Let's create a simple UserModule with Entity, Service,
   Controller, and Module, to be used in our tutorial so we can cache
   user-related information with the cache module:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { UserCache } from '../user-cache/user-cache.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @OneToMany(() => UserCache, (userCache) => userCache.assignee)
  userCaches!: UserCache[];
}
```

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  findOne(id: string): Promise<User> {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    const newUser = this.userRepository.create(userData);
    await this.userRepository.save(newUser);
    return newUser;
  }
}
```

```typescript
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.entity';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    return this.userService.findOne(id);
  }

  @Post()
  async create(@Body() userData: Partial<User>): Promise<User>  {
    return this.userService.create(userData);
  }
}
```

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
```

1. **User Cache Module**: Let's create the entity `UserCache` and the
   `UserCacheModule` that imports our `CacheModule` passing all configurations
   needed. Please note that `CacheSqliteEntity` and `CachePostgresEntity` are
   provided by the Rockets NestJS Cache module, so you can use them to create
   your cache entity. They have a unique index with the following properties:
   `'key', 'type', 'assignee.id'` and it will throw a
   `CacheEntityAlreadyExistsException` if duplicated:

```typescript
import { Entity, ManyToOne } from 'typeorm';
import { User } from '../user/user.entity';
import { CacheSqliteEntity } from '@concepta/nestjs-cache';
import { ReferenceIdInterface } from '@concepta/nestjs-common';

@Entity()
export class UserCache extends CacheSqliteEntity {
  @ManyToOne(() => User, (user) => user.userCaches)
  assignee!: ReferenceIdInterface;
}
```

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';
import { CrudModule } from '@concepta/nestjs-crud';
import { CacheModule } from '@concepta/nestjs-cache';
import { User } from '../user/user.entity';
import { UserCache } from './user-cache.entity';

@Module({
  imports: [
    TypeOrmExtModule.forFeature({
          userCache: {
            entity: UserCache,
          },
        }),
    CacheModule.register({
      settings: {
        assignments: {
          user: { entityKey: 'userCache' },
        },
      },
    }),
    CrudModule.forRoot({}),
  ],
})
export class UserCacheModule {}
```

1. **App Module**:And let's create our app module to connect everything.

```ts
import { Module } from '@nestjs/common';
import { UserCacheModule } from './user-cache/user-cache.module';
import { UserModule } from './user/user.module';
import { User } from './user/user.entity';
import { UserCache } from './user-cache/user-cache.entity';
import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';

@Module({
imports: [
  TypeOrmExtModule.forRoot({
    type: 'sqlite',
    database: ':memory:',
    synchronize: true,
    entities: [User, UserCache],
  }),
  UserCacheModule,
  UserModule,
],
controllers: [],
providers: [],
})
export class AppModule {}
```

#### Using the RestFull endpoints to access cache

After setting up the basic configuration, you can start using the caching
functionality in your application.

```ts
assignments: {
  user: { entityKey: 'userCache' },
},
```

The code above will generate a route for the client to have access, the module
will generate the following endpoint `/cache/user`. This endpoint will be
referencing whatever entity was associated in the entities section, as you can
see below.

```ts
entities: {
    userCache: {
    entity: UserCacheEntityFixture,
  },
},
```

This will make the following endpoints available:

1. **Create (POST)**: To create a new cache entry, the request body should
match the `CacheCreatableInterface`; Properties `key, type and assignee.id`
are unique and will throw a `CacheEntityAlreadyExistsException` error on
attempt to insert duplicated data:

```ts
export interface CacheCreatableInterface extends Pick<CacheInterface, 'key' | 'type' | 'data' | 'assignee'> {
  expiresIn: string | null;
}
```

Example curl command:

```sh
curl -X POST http://your-api-url/cache/user \
-H "Content-Type: application/json" \
-d '{
  "key": "exampleKey",
  "type": "exampleType",
  "data": "{data: 'example'}",
  "assignee": { id: 'exampleId'},
  "expiresIn": "1h"
}'
```

1. **Read (GET)**: To read a cache entry by its ID:

```sh
curl -X GET http://your-api-url/cache/user/{id}
```

1. **Update (PUT)**: To update an existing cache entry, the request body should
match the `CacheUpdatableInterface`:

```ts
export interface CacheUpdatableInterface extends Pick<CacheInterface, 'key' | 'type' | 'data' | 'assignee'> {
  expiresIn: string | null;
}
```

Example curl command:

```sh
curl -X PUT http://your-api-url/cache/user/{id} \
-H "Content-Type: application/json" \
-d '{
  "key": "updatedKey",
  "type": "updatedType",
  "data": "updatedData",
  "assignee": "updatedAssignee",
  "expiresIn": "2d"
}'
```

1. **Delete (DELETE)**: To delete a cache entry by its ID:

```sh
curl -X DELETE http://your-api-url/cache/user/{id}
```

Replace `http://your-api-url` with the actual base URL of your API, and `{id}`
with the actual ID of the cache entry you wish to interact with.

1. **Testing the cache**: You can test the cache by creating a new user and
then accessing the cache endpoint:

```bash
curl -X POST http://your-api-url/user \
-H "Content-Type: application/json" \
-d '{
  "name": "John Doe",
}'
```

The response will be something like this:

```json
{
    "name": "John Doe",
    "id": "5f84d150-7ebd-4c59-997a-df65a5935123"
}
```

Now, let's add something to the cache with reference of the user

```bash
curl -X POST http://your-api-url/cache/user \
-H "Content-Type: application/json" \
-d '{
  "key": "user",
  "type": "filter",
  "data": "{data: 'example'}",
  "assignee": { "id": "5f84d150-7ebd-4c59-997a-df65a5935123"},
  "expiresIn": "1h"
}'
```

It will give you a response similar to this.

```json
{
    "id": "a70e629b-7e6d-4dcc-9e74-a2e376f1c19a",
    "dateCreated": "2024-06-07T15:16:56.000Z",
    "dateUpdated": "2024-06-07T15:16:56.000Z",
    "dateDeleted": null,
    "version": 1,
    "key": "user",
    "data": "{data: 'example'}",
    "type": "filter",
    "assignee": {
        "id": "0e5bee5d-5d53-46ef-a94a-22aceea81fc5"
    }
}
```

Now, if you access the cache endpoint `/cache/user`, you will see the new user
cached:

```bash
  curl -X GET http://your-api-url/cache/user
```

```json
[
  {
      "id": "24864a7e-372e-4426-97f0-7e1c7514be16",
      "dateCreated": "2024-06-07T15:47:38.000Z",
      "dateUpdated": "2024-06-07T15:47:38.000Z",
      "dateDeleted": null,
      "version": 1,
      "key": "user",
      "data": "{data: 'example'}",
      "type": "filter",
      "assignee": {
          "id": "5f84d150-7ebd-4c59-997a-df65a5935123"
      }
  }
]
```

# How-to Guides

## Registering CacheModule Synchronously

To register the CacheModule synchronously, you can use the `register` method.
This method allows you to pass configuration options directly.

```ts
@Module({
  imports: [
    TypeOrmExtModule.forFeature({
          userCache: {
            entity: UserCacheEntityFixture,
          },
        }),
    CacheModule.register({
      settings: {
        assignments: {
          user: { entityKey: 'userCache' },
        },
      },
    }),
  ],
})
export class AppModule {}
```

## Registering CacheModule Asynchronously

For more advanced use cases, you can register the CacheModule asynchronously using
the `registerAsync` method. This method is useful when you need to perform
asynchronous operations to get the configuration options.

```ts
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [
        TypeOrmExtModule.forFeature({
          userCache: {
            entity: UserCacheEntityFixture,
          },
        }),
      ],
      entities: ['userCache'],
      useFactory: async () => ({
        settings: {
          assignments: {
            user: { entityKey: 'userCache' },
          },
        },
      }),
    }),
  ],
})
export class AppModule {}
```

## Global Registering CacheModule Asynchronously

For more advanced use cases, you can register the global CacheModule asynchronously
using the `forRootAsync` method. This method is useful when you need to perform
asynchronous operations to get the configuration options.

```ts
@Module({
  imports: [
    CacheModule.forRootAsync({
      imports: [
        TypeOrmExtModule.forFeature({
          userCache: {
            entity: UserCacheEntityFixture,
          },
        }),
      ],
      entities: ['userCache'],
      useFactory: async () => ({
        settings: {
          assignments: {
            user: { entityKey: 'userCache' },
          },
        },
      }),
    }),
  ],
})
export class AppModule {}
```

## Registering CacheModule Asynchronously for multiple entities

This section demonstrates how to register the CacheModule asynchronously when
dealing with multiple entities.

### Example

```ts
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [
        TypeOrmExtModule.forFeature({
          userCache: {
            entity: UserCacheEntityFixture,
          },
           petCache: {
            entity: PetCacheEntity,
          },
        }),
      ],
      entities: ['userCache'],
      useFactory: async () => ({
        settings: {
          assignments: {
            user: { entityKey: 'userCache' },
            pet: { entityKey: 'petCache' },
          },
        },
      }),
    }),
  ],
})
export class AppModule {}
```

## Using the CacheService to access cache

The `CacheService` provided by the Rockets NestJS Cache module offers a
comprehensive set of methods to manage cache entries programmatically from the
API side. This service allows for creating, updating, retrieving, and deleting
cache entries, as well as managing cache entries for specific assignees. Below
is an overview of how to use these services in your application.

### Creating a Cache Entry

To create a new cache entry, you can use the `create` method of the `CacheService`.
This method requires specifying the cache assignment, the cache data, and
optionally, query options.

### CacheService Methods Documentation

CacheService is exported in the CacheModule, so
Below is a simple documentation for each method in the `CacheService` class, including
 examples of how to use them.

#### 1. `create(assignment, cache, queryOptions)`

Creates a new cache entry.

**Parameters:**

- `assignment`: The cache assignment.
- `cache`: The data to create, implementing `CacheCreatableInterface`.
- `queryOptions`: Optional. Additional options for the query.

**Example:**
Create a cache entry with a unique combination of `key`, `type`, and `assignee.id`:

```ts
await cacheService.create('userCache', {
  key: 'userSession',
  type: 'session',
  data: { sessionData: 'abc123' },
  assignee: { id: 'user1' },
  expiresIn: '24h'
});
```

#### 2. `update(assignment, cache, queryOptions)`

Updates an existing cache entry.

**Parameters:**

- `assignment`: The cache assignment.
- `cache`: The data to update, implementing `CacheUpdatableInterface`.
- `queryOptions`: Optional. Additional options for the query.

**Example:**
Update a cache entry identified by `key`, `type`, and `assignee.id`:

```ts
await cacheService.update('userCache', {
  key: 'userSession',
  type: 'session',
  data: { sessionData: 'updated123' },
  assignee: { id: 'user1' }
});
```

#### 3. `delete(assignment, cache, queryOptions)`

Deletes a cache entry.

**Parameters:**

- `assignment`: The cache assignment.
- `cache`: The cache to delete, specifying `key`, `type`, and `assignee`.

**Example:**
Delete a cache entry using `key`, `type`, and `assignee.id`:

```ts
await cacheService.delete('userCache', {
  key: 'userSession',
  type: 'session',
  assignee: { id: 'user1' }
});
```

#### 4. `getAssignedCaches(assignment, cache, queryOptions)`

Retrieves all cache entries for a given assignee.

**Parameters:**

- `assignment`: The cache assignment.
- `cache`: The cache to get assignments, specifying `assignee`.

**Example:**
Retrieve all caches for a specific assignee:

```ts
const caches = await cacheService.getAssignedCaches('userCache', { assignee: { id: 'userId' } });
```

#### 5. `get(assignment, cache, queryOptions)`

Retrieves a specific cache entry.

**Parameters:**

- `assignment`: The cache assignment.
- `cache`: The cache to get, specifying `key`, `type`, and `assignee`.

**Example:**
Retrieve a specific cache entry using `key`, `type`, and `assignee.id`:

```ts
const cacheEntry = await cacheService.get('userCache', {
  key: 'userSession',
  type: 'session',
  assignee: { id: 'user1' }
});
```

#### 6. `clear(assignment, cache, queryOptions)`

Clears all caches for a given assignee.

**Parameters:**

- `assignment`: The cache assignment.
- `cache`: The cache to clear, specifying `assignee`.

**Example:**
Clear all caches for a specific assignee:

```ts
await cacheService.clear('userCache', { assignee: { id: 'user1' } });
```

These methods provide a comprehensive interface for managing cache entries in a
NestJS application using the `CacheService`. Each method supports optional query
options for more granular control over the database operations.

## Reference

For detailed information on the properties, methods, and classes used in the
`@concepta/nestjs-cache`, please refer to the API documentation
available at [CacheModule API Documentation](https://www.rockets.tools/reference/rockets/nestjs-access-control/README).
This documentation provides comprehensive details on the interfaces and services
that you can utilize to start using cache functionality within your NestJS
application.

## Explanation

### Conceptual Overview of Caching

#### What is Caching?

Caching is a technique used to store copies of data in a temporary storage location
(cache) so that future requests for that data can be served faster. It helps in
reducing the time required to access data and decreases the load on the primary
data source.

#### Benefits of Using Cache

- **Improved Performance**: By serving data from the cache, applications can
  respond to requests faster than retrieving the data from the primary source
  each time.
- **Reduced Latency**: Caching reduces the latency involved in data retrieval
  operations, improving the user experience.
- **Lower Database Load**: By reducing the number of direct database queries,
  caching helps in decreasing the load on the database, leading to better overall
  performance.
- **Scalability**: Caching allows applications to handle higher loads by serving
  frequent requests from the cache instead of the database.

#### Why Use NestJS Cache?

NestJS Cache provides a powerful and flexible caching solution that integrates
seamlessly with the NestJS framework and stores your cache on the database, so
you can reuse it in any other part of your application or even in other
applications that are calling your API. It allows developers to manage cached
data efficiently and provides built-in support for CRUD operations on cache
entries. Here are some key reasons to use NestJS Cache:

- **Integration with NestJS Ecosystem**: The module integrates well with other
  NestJS modules and leverages the framework's features, such as decorators and
  dependency injection.
- **Customizable and Extensible**: It allows for customization through various
  configuration options and can be extended with custom services and guards.
- **Ease of Use**: The module provides straightforward APIs for managing cache
  entries, making it easy to implement caching in your application.
- **Automatic Expiration Handling**: The module can automatically handle
  expiration times for cache entries, ensuring that stale data is not served.

#### When to Use NestJS Cache

NestJS Cache is useful in scenarios where data is frequently accessed but does
not change often. It is also beneficial when the performance of data retrieval
operations needs to be improved. Here are some examples of when to use NestJS
Cache:

- **Storing Filters for a Specific Dashboard**: If you have a dashboard with
  complex filters that are expensive to compute, you can cache the filters for
  each user. This way, subsequent requests can be served from the cache, reducing
  the load on the server and improving response times.

Example:
When a user applies a filter on a dashboard, the filter settings can be cached.
The next time the user accesses the dashboard, the cached filter can be retrieved
quickly without recomputing it.

#### How CacheOptionsInterface is Used in the Controller and Endpoints

The `CacheSettingsInterface` and `CacheOptionsInterface` are used to configure
the caching behavior in the `CacheCrudController`. The `CacheCrudController`
provides endpoints for CRUD operations on cache entries and uses these
interfaces to manage the settings and services for each cache assignment.

- `CacheSettingsInterface` manages how entities are assigned for caching and
  specifies the expiration time for cache entries. It is used to ensure the
  correct service and configuration are applied to each cache assignment.
- `CacheOptionsInterface` includes the settings for managing cache assignments
  and expiration times. It is used to register and configure the CacheModule,
  determining which entities should be cached and how they should be handled.

By using these interfaces, the `CacheCrudController` can dynamically handle
different cache assignments and provide a consistent caching strategy across
the application. The endpoints in the controller allow for creating, reading,
updating, and deleting cache entries, ensuring that the caching behavior is
flexible and easily configurable.

#### Design Choices in CacheModule

##### Global vs Synchronous vs Asynchronous Registration

- **Global Registration**: Registers the CacheModule at the root level, making it
  available throughout the entire application. It is useful for shared
  configurations that need to be applied universally.
- **Synchronous Registration**: This method is used when all configuration options
  are available at the time of module registration. It is simple and
  straightforward, making it suitable for most use cases.
- **Asynchronous Registration**: This method is used when configuration options
  need to be fetched or computed asynchronously. It provides greater flexibility
  and is useful for advanced scenarios where configuration depends on runtime
  conditions.
