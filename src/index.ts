import type { Duration } from "date-fns";
import type Job from "./job";
import JobRunner from "./job-runner";
import type BaseJobStore from "./job-store";

export type { default as BaseJobLock } from "./job-lock";
export type { default as MongodbJobLock } from "./job-lock/mongodb";
export type { default as RedisJobLock } from "./job-lock/redis";
export type { default as TypeormJobLock } from "./job-lock/typeorm";
export type { default as BaseJobStore } from "./job-store";
export { default as MongodbJobStore } from "./job-store/mongodb";
export { default as RedisJobStore } from "./job-store/redis";
export { default as TypeormJobStore } from "./job-store/typeorm";
export { default as MysqlJobStore } from "./job-store/typeorm/mysql";
export { default as PostgresJobStore } from "./job-store/typeorm/postgres";
export { default as Job } from "./job";
export { CronyxError } from "./error";

/**
 * @public
 */
export type JobLockId<S> = S extends BaseJobStore<infer I> ? I : never;

/**
 * @public
 */
export type CronyxOptions<S extends BaseJobStore<unknown>> = {
  jobStore: S;
  timezone?: string;
};

/**
 * @public
 */
export type BaseRequestJobOptions = {
  jobName: string;
  jobInterval: Duration | string | number;
  startBuffer?: Duration | number;
  retryInterval?: Duration | number;
  requiredJobNames?: string[];
  timezone?: string;
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
export default class Cronyx<S extends BaseJobStore<I>, I = JobLockId<S>> {
  #jobStore: S;
  #timezone: string | undefined;

  constructor(options: CronyxOptions<S>) {
    this.#jobStore = options.jobStore;
    this.#timezone = options.timezone;
  }

  async requestJobExec(options: RequestJobOptions, task: (job: Job<I>) => Promise<void>): Promise<void> {
    const jobRunner = new JobRunner(this.#jobStore, options.jobName, options.jobInterval, {
      timezone: options.timezone ?? this.#timezone,
      requiredJobNames: options.requiredJobNames,
      startBuffer: options.startBuffer,
      retryInterval: options.retryInterval,
      noLock: options.noLock,
      jobIntervalStartedAt: options.jobIntervalStartedAt,
    });
    return await jobRunner.requestJobExec(task);
  }

  async requestJobStart(options: RequestJobOptions): Promise<Job<I> | null> {
    const jobRunner = new JobRunner(this.#jobStore, options.jobName, options.jobInterval, {
      timezone: options.timezone ?? this.#timezone,
      requiredJobNames: options.requiredJobNames,
      startBuffer: options.startBuffer,
      retryInterval: options.retryInterval,
      noLock: options.noLock,
      jobIntervalStartedAt: options.jobIntervalStartedAt,
    });
    return await jobRunner.requestJobStart();
  }
}
