# API reference

## Table of Contents

- [Cronyx Class](#cronyx-class)
  - [Constructor](#constructor)
  - [Methods](#methods)
- [Job Class](#job-class)
  - [Properties](#properties)
  - [Methods](#methods-1)
- [Job Stores](#job-stores)
  - [MongodbJobStore Class](#mongodbjobstore-class)
  - [RedisJobStore Class](#redisjobstore-class)
  - [MysqlJobStore Class](#mysqljobstore-class)
  - [PostgresJobStore Class](#postgresjobstore-class)

## Cronyx Class

The `Cronyx` class is responsible for managing the lifecycle of jobs, initiating, and executing tasks based on given criteria.

### Constructor

```ts
constructor(options: CronyxOptions)
```

**Parameters**:

- `options`:
  - `jobStore`: [BaseJobStore] - Persistent job locks storage.
  - `timezone?` (**optional**): [string] - Defaults to local timezone if not provided.

### Methods

#### `requestJobStart`

Initiate the job based on the specified criteria.

```ts
requestJobStart(options: JobStartOptions): Promise<Job>
```

**Parameters**:

- `options`:
  - `jobName`: [string] - A unique identifier for the series of jobs.
  - `jobInterval`: [Duration] | [string] | [number] - Specifies how frequently the job runs.
  - `startBuffer?` (**optional**): [Duration] | [number] - Adds a delay before the job starts.
  - `retryInterval?` (**optional**): [Duration] | [number] - Allows bypassing of an active job lock after a specified period.
  - `requiredJobNames?` (**optional**): [Array]<[string]> - Specifies dependencies using their job names.
  - `timezone?` (**optional**): [string] - Overrides `timezone` of the constructor argument.
  - `noLock?` (**optional**): [boolean] - Bypasses job locks, letting other processes run the job.
  - `jobIntervalStartedAt?` (**optional**): [Date] - Sets the start interval manually. Use with the `noLock` option.

#### `requestJobExec`

Execute a specified task for a job, often used when a specific task needs to be run without considering the full job lifecycle.

```ts
requestJobExec(options: JobStartOptions, task: (job: Job) => Promise<void>): Promise<Job>
```

**Parameters**:

- `options`: Same as described in `requestJobStart`.
- `task`: Function that defines the task to be executed for the job.

## Job Class

The `Job` class encapsulates individual tasks managed and executed by Cronyx.

### Properties

- `id`: [string] | [ObjectId] | [null] - A unique identifier for the job, returns `null` for bypassed job lock.
- `name`: [string] - The identifier for the series of jobs.
- `interval`: [number] - The frequency of the job in milliseconds.
- `isActive`: [boolean] - The active status of the job.
- `intervalStartedAt`: [Date] - Starting time of the job's interval.
- `intervalEndedAt`: [Date] - Ending time of the job's interval.
- `createdAt`: [Date] - Created date of the job.
- `updatedAt`: [Date] - Last updated date of the job.

### Methods

#### `finish`

Mark a job as successfully completed.

```ts
finish(): Promise<void>
```

#### `interrupt`

Indicate that a job has been prematurely halted, either due to an error or another unforeseen circumstance.

```ts
interrupt(): Promise<void>
```

## Job Stores

Job Stores facilitate connections to different databases or storage solutions for persisting job states and locks.

### MongodbJobStore Class

Connect to a MongoDB server.

#### `connect`

```ts
static connect(url: string, options: MongoClientOptions): Promise<MongodbJobStore>
```

**Parameters**:

- `url`: [string] - MongoDB connection URL.
- `options`: [MongoClientOptions] - Options for MongoDB connection.

#### Methods

##### `sync`

Create indexes on joblocks collection manually.

```ts
sync(): Promise<Job>
```

##### `close`

Close connection to the MongoDB server

```ts
close(): Promise<Job>
```

### RedisJobStore Class

Connect to a Redis server.

#### `connect`

```ts
static connect(options: RedisClientOptions): Promise<RedisJobStore>
```

**Parameters**:

- `options`: [RedisClientOptions] - Options for Redis connection.

#### Methods

##### `sync`

Do nothing. Provided for the consistency with other job stores.

```ts
sync(): Promise<Job>
```

##### `close`

Close connection to the Redis server

```ts
close(): Promise<Job>
```

### MysqlJobStore Class

Connect to a MySQL database.

#### `connect`

```ts
static connect(options: MysqlConnectionOptions): Promise<MysqlJobStore>
```

**Parameters**:

- `options`: [MysqlConnectionOptions] - Options for MySQL connection.

#### Methods

##### `sync`

Create joblocks table and indexes manually.

```ts
sync(): Promise<Job>
```

##### `close`

Close connection to the MySQL server

```ts
close(): Promise<Job>
```

### PostgresJobStore Class

Connect to a PostgreSQL database.

#### `connect`

```ts
static connect(options: PostgresConnectionOptions): Promise<PostgresJobStore>
```

**Parameters**:

- `options`: [PostgresConnectionOptions] - Options for PostgreSQL connection.

##### `sync`

Create joblocks table and indexes manually.

```ts
sync(): Promise<Job>
```

##### `close`

Close connection to the Postgres server

```ts
close(): Promise<Job>
```

[null]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/null "null"
[Array]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array "Array"
[boolean]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type "Boolean"
[number]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type "Number"
[string]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type "String"
[Date]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date "Date"
[Duration]: https://date-fns.org/v2.30.0/docs/Duration "Duration"
[BaseJobStore]: https://github.com/yujiosaka/Cronyx/blob/main/docs/API.md#class-basejobstore "BaseJobStore"
[MongoClientOptions]: https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/ "MongoClientOptions"
[RedisClientOptions]: https://github.com/redis/node-redis/blob/master/docs/client-configuration.md "RedisClientOptions"
[MysqlConnectionOptions]: https://typeorm.delightful.studio/interfaces/_driver_mysql_mysqlconnectionoptions_.mysqlconnectionoptions.html "MysqlConnectionOptions"
[PostgresConnectionOptions]: https://typeorm.delightful.studio/interfaces/_driver_postgres_postgresconnectionoptions_.postgresconnectionoptions "PostgresConnectionOptions"
[ObjectId]: https://mongoosejs.com/docs/schematypes.html#objectids "ObjectId"