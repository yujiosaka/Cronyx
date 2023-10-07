import type { Duration } from "date-fns";
import type Job from "./job";
import JobRunner from "./job-runner";
import type BaseJobStore from "./job-store/base";

/**
 * @public
 */
export type CronyxOptions<T> = {
  jobStore: BaseJobStore<T>;
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
export default class Cronyx<T> {
  #jobStore: BaseJobStore<T>;
  #timezone: string | undefined;

  constructor(options: CronyxOptions<T>) {
    this.#jobStore = options.jobStore;
    this.#timezone = options.timezone;
  }

  async requestJobExec(options: RequestJobOptions, task: (job: Job<T>) => Promise<void>): Promise<void> {
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

  async requestJobStart(options: RequestJobOptions): Promise<Job<T> | null> {
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
