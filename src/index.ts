import type { Duration } from "date-fns";
import type Job from "./job";
import JobRunner from "./job-runner";
import type BaseJobStore from "./job-store/base";

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
export type CronyxOptions<S extends Source> = {
  jobStore: BaseJobStore<S>;
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
  #jobStore: BaseJobStore<S>;
  #timezone: string | undefined;

  constructor(options: CronyxOptions<S>) {
    this.#jobStore = options.jobStore;
    this.#timezone = options.timezone;
  }

  async requestJobExec(options: RequestJobOptions, task: (job: Job<S>) => Promise<void>): Promise<void> {
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

  async requestJobStart(options: RequestJobOptions): Promise<Job<S> | null> {
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
