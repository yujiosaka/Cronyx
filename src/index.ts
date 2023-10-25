import type { Duration } from "date-fns";
import type { Types } from "mongoose";
import type Job from "./job";
import JobRunner from "./job-runner";
import type BaseJobStore from "./job-store";

/**
 * @public
 */
export type { default as BaseJobLock } from "./job-lock";

/**
 * @public
 */
export type { default as MongodbJobLock } from "./job-lock/mongodb";

/**
 * @public
 */
export type { default as RedisJobLock } from "./job-lock/redis";

/**
 * @public
 */
export type { default as TypeormJobLock } from "./job-lock/typeorm";

/**
 * @public
 */
export type { default as BaseJobStore } from "./job-store";

/**
 * @public
 */
export { default as MongodbJobStore } from "./job-store/mongodb";

/**
 * @public
 */
export { default as RedisJobStore } from "./job-store/redis";

/**
 * @public
 */
export { default as MysqlJobStore } from "./job-store/typeorm/mysql";

/**
 * @public
 */
export { default as PostgresJobStore } from "./job-store/typeorm/postgres";

/**
 * @public
 */
export { default as Job } from "./job";

/**
 * @public
 */
export { CronyxError } from "./error";

/**
 * @public
 */
export enum Source {
  Mongodb = "mongodb",
  Redis = "redis",
  Mysql = "mysql",
  Postgres = "Postgres",
}

/**
 * @public
 */
export type JobLockId<S extends Source> = S extends Source.Mongodb
  ? Types.ObjectId
  : S extends Source.Redis
  ? string
  : S extends Source.Mysql
  ? string
  : S extends Source.Postgres
  ? string
  : never;

/**
 * @public
 */
export type CronyxOptions<S extends Source> = {
  jobStore: BaseJobStore<JobLockId<S>>;
  timezone?: string;
};

type BaseRequestJobOptions = {
  jobName: string;
  jobInterval: Duration | string | number;
  startBuffer?: Duration | number;
  retryInterval?: Duration | number;
  requiredJobNames?: string[];
};

/**
 * @public
 */
export type RequestJobOptions =
  | (BaseRequestJobOptions & { noLock: true; jobIntervalStartedAt: Date })
  | (BaseRequestJobOptions & { noLock?: boolean; jobIntervalStartedAt?: never });

/**
 * @public
 */
export default class Cronyx<S extends Source> {
  #jobStore: BaseJobStore<JobLockId<S>>;
  #timezone: string | undefined;

  constructor(options: CronyxOptions<S>) {
    this.#jobStore = options.jobStore;
    this.#timezone = options.timezone;
  }

  async requestJobExec(options: RequestJobOptions, task: (job: Job<JobLockId<S>>) => Promise<void>): Promise<void> {
    const jobRunner = new JobRunner(this.#jobStore, options.jobName, options.jobInterval, {
      timezone: this.#timezone,
      requiredJobNames: options.requiredJobNames,
      startBuffer: options.startBuffer,
      retryInterval: options.retryInterval,
      noLock: options.noLock,
      jobIntervalStartedAt: options.jobIntervalStartedAt,
    });
    return await jobRunner.requestJobExec(task);
  }

  async requestJobStart(options: RequestJobOptions): Promise<Job<JobLockId<S>> | null> {
    const jobRunner = new JobRunner(this.#jobStore, options.jobName, options.jobInterval, {
      timezone: this.#timezone,
      requiredJobNames: options.requiredJobNames,
      startBuffer: options.startBuffer,
      retryInterval: options.retryInterval,
      noLock: options.noLock,
      jobIntervalStartedAt: options.jobIntervalStartedAt,
    });
    return await jobRunner.requestJobStart();
  }
}
