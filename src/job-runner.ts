import type { Duration } from "date-fns";
import { differenceInMilliseconds } from "date-fns";
import { CronyxError } from "./error";
import Job from "./job";
import type BaseJobLock from "./job-lock/base";
import MockJobLock from "./job-lock/mock";
import type BaseJobStore from "./job-store/base";
import { addInterval, getLastDeactivatedJobIntervalEndedAt, log, subInterval } from "./util";

type JobRunnerOptions = {
  timezone?: string;
  requiredJobNames?: string[];
  startBuffer?: Duration | number;
  retryInterval?: Duration | number;
  noLock?: boolean;
  jobIntervalStartedAt?: Date;
};

/**
 * @internal
 */
export default class JobRunner<T> {
  #jobStore: BaseJobStore<T>;
  #timezone: string;
  #jobName: string;
  #jobInterval: Duration | string | number;
  #requiredJobNames: string[];
  #startBuffer: Duration | number;
  #retryInterval: Duration | number | undefined;
  #noLock: boolean;
  #jobIntervalStartedAt: Date | undefined;

  constructor(
    jobStore: BaseJobStore<T>,
    jobName: string,
    jobInterval: Duration | string | number,
    options?: JobRunnerOptions,
  ) {
    this.#jobStore = jobStore;
    this.#jobName = jobName;
    this.#jobInterval = jobInterval;
    this.#timezone = options?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.#requiredJobNames = options?.requiredJobNames ?? [];
    this.#startBuffer = options?.startBuffer ?? 0;
    this.#retryInterval = options?.retryInterval;
    this.#noLock = options?.noLock ?? false;
    this.#jobIntervalStartedAt = options?.jobIntervalStartedAt;
  }

  async requestJobExec(task: (job: Job<T>) => Promise<void>): Promise<void> {
    const job = await this.requestJobStart();
    if (!job) return;

    try {
      await task(job);
      await job.finish();
    } catch (error) {
      await job.interrupt();
      throw error;
    }
  }

  async requestJobStart(): Promise<Job<T> | null> {
    if (this.#jobIntervalStartedAt) {
      if (!this.#noLock) throw new CronyxError("Should enable `noLock` when `jobIntervalStartedAt` is passed");

      const jobIntervalEndedAt = addInterval(this.#jobIntervalStartedAt, this.#jobInterval, this.#timezone);
      const jobInterval = differenceInMilliseconds(jobIntervalEndedAt, this.#jobIntervalStartedAt);
      const jobLock = MockJobLock.parse({ jobName: this.#jobName, jobInterval, jobIntervalEndedAt });

      log(`Job from ${this.#jobIntervalStartedAt} to ${jobIntervalEndedAt} is started for ${this.#jobName}`);
      return new Job(this.#jobStore, jobLock);
    }

    const requestedAt = new Date();
    const retryIntervalStartedAt = subInterval(requestedAt, this.#retryInterval ?? requestedAt.getTime(), this.#timezone);
    const lastJobLock = await this.#ensureLastJobLock(requestedAt);
    if (lastJobLock.isActive && lastJobLock.updatedAt > retryIntervalStartedAt) {
      return null;
    }

    const jobIntervalStartedAt = getLastDeactivatedJobIntervalEndedAt(lastJobLock);
    const jobIntervalEndedAt = addInterval(jobIntervalStartedAt, this.#jobInterval, this.#timezone);
    if (lastJobLock._id !== null && subInterval(requestedAt, this.#startBuffer, this.#timezone) < jobIntervalEndedAt) {
      log(`Job is not reached to start time for ${this.#jobName}`);
      return null;
    }

    const areRequiredJobsFulfilled = await this.#areRequiredJobsFulfilled(jobIntervalEndedAt);
    if (!areRequiredJobsFulfilled) {
      return null;
    }

    const jobInterval = differenceInMilliseconds(jobIntervalEndedAt, jobIntervalStartedAt);
    if (this.#noLock) {
      const jobLock = MockJobLock.parse({ jobName: this.#jobName, jobInterval, jobIntervalEndedAt });
      return new Job(this.#jobStore, jobLock);
    }

    let jobLock: BaseJobLock<T> | null;
    try {
      jobLock = await this.#jobStore.activateJobLock(this.#jobName, jobInterval, jobIntervalEndedAt, retryIntervalStartedAt);
    } catch (error) {
      throw new CronyxError(`Cannot activate job lock for ${this.#jobName}`, { cause: error });
    }
    if (!jobLock) {
      log(`Job is currently active for ${this.#jobName}`);
      return null;
    }

    log(`Job from ${jobIntervalStartedAt} to ${jobIntervalEndedAt} is started for ${this.#jobName}`);
    return new Job(this.#jobStore, jobLock);
  }

  async #ensureLastJobLock(requestedAt: Date): Promise<BaseJobLock<T>> {
    let lastJobLock: BaseJobLock<T> | null;
    try {
      lastJobLock = await this.#jobStore.fetchLastJobLock(this.#jobName);
    } catch (error) {
      throw new CronyxError(`Cannot find last job lock for ${this.#jobName}`, { cause: error });
    }
    if (lastJobLock) {
      return lastJobLock;
    }

    try {
      const jobIntervalEndedAt = subInterval(requestedAt, this.#jobInterval, this.#timezone);
      return MockJobLock.parse({ jobName: this.#jobName, jobIntervalEndedAt, isActive: false });
    } catch (error) {
      throw new CronyxError(`Cannot create job lock for ${this.#jobName}`, { cause: error });
    }
  }

  async #areRequiredJobsFulfilled(jobIntervalEndedAt: Date): Promise<boolean> {
    for (const requiredJobName of this.#requiredJobNames) {
      let requiredJobLock: BaseJobLock<T> | null;

      try {
        requiredJobLock = await this.#jobStore.fetchLastJobLock(requiredJobName);
      } catch (error) {
        throw new CronyxError(`Cannot find required job lock for ${requiredJobName}`, { cause: error });
      }
      if (!requiredJobLock) {
        log(`Required jobs ${requiredJobName} is not fulfilled for ${this.#jobName}`);
        return false;
      }

      const requiredJobIntervalEndedAt = getLastDeactivatedJobIntervalEndedAt(requiredJobLock);
      if (requiredJobIntervalEndedAt < jobIntervalEndedAt) {
        log(`Required jobs ${requiredJobName} is not fulfilled for ${this.#jobName}`);
        return false;
      }
    }

    return true;
  }
}
