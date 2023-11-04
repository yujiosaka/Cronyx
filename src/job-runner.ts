import type { Duration } from "date-fns";
import { differenceInMilliseconds, min } from "date-fns";
import { CronyxArgumentError, CronyxError } from "./error";
import Job from "./job";
import type BaseJobLock from "./job-lock";
import MockJobLock from "./job-lock/mock";
import type BaseJobStore from "./job-store";
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
export default class JobRunner<I> {
  #jobStore: BaseJobStore<I>;
  #timezone: string;
  #jobName: string;
  #jobInterval: Duration | string | number;
  #requiredJobNames: string[];
  #startBuffer: Duration | number;
  #retryInterval: Duration | number | undefined;
  #noLock: boolean;
  #jobIntervalStartedAt: Date | undefined;

  constructor(
    jobStore: BaseJobStore<I>,
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

  async requestJobExec(task: (job: Job<I>) => Promise<void>): Promise<void> {
    const job = await this.requestJobStart();
    if (!job) return;

    try {
      await task(job);
    } catch (error) {
      await job.interrupt();
      throw error;
    }

    await job.finish();
  }

  async requestJobStart(): Promise<Job<I> | null> {
    const requestedAt = new Date();
    const bufferedRequestedAt = subInterval(requestedAt, this.#startBuffer, this.#timezone);

    if (this.#jobIntervalStartedAt) {
      if (!this.#noLock) throw new CronyxArgumentError("Should enable `noLock` when `jobIntervalStartedAt` is passed");

      if (bufferedRequestedAt < this.#jobIntervalStartedAt) {
        log(`Job is not reached to start time for ${this.#jobName}`);
        return null;
      }

      const maxJobIntervalEndedAt = addInterval(this.#jobIntervalStartedAt, this.#jobInterval, this.#timezone);
      const jobIntervalEndedAt = min([maxJobIntervalEndedAt, bufferedRequestedAt]);
      const jobInterval = differenceInMilliseconds(jobIntervalEndedAt, this.#jobIntervalStartedAt);
      const jobLock = MockJobLock.parse({ jobName: this.#jobName, jobInterval, jobIntervalEndedAt });

      log(
        `Job from ${this.#jobIntervalStartedAt.toISOString()} to ${jobIntervalEndedAt.toISOString()} is started for ${
          this.#jobName
        }`,
      );
      return new Job(this.#jobStore, jobLock);
    }

    const retryIntervalStartedAt = subInterval(requestedAt, this.#retryInterval ?? requestedAt.getTime(), this.#timezone);
    const lastJobLock = await this.#ensureLastJobLock(requestedAt);
    if (lastJobLock.isActive && lastJobLock.updatedAt > retryIntervalStartedAt) {
      return null;
    }

    const jobIntervalStartedAt = getLastDeactivatedJobIntervalEndedAt(lastJobLock);
    const maxJobIntervalEndedAt = addInterval(jobIntervalStartedAt, this.#jobInterval, this.#timezone);
    if (lastJobLock._id !== null && bufferedRequestedAt < maxJobIntervalEndedAt) {
      log(`Job is not reached to start time for ${this.#jobName}`);
      return null;
    }

    const jobIntervalEndedAt = min([maxJobIntervalEndedAt, bufferedRequestedAt]);
    const areRequiredJobsFulfilled = await this.#areRequiredJobsFulfilled(jobIntervalEndedAt);
    if (!areRequiredJobsFulfilled) {
      return null;
    }

    const jobInterval = differenceInMilliseconds(jobIntervalEndedAt, jobIntervalStartedAt);
    if (this.#noLock) {
      const jobLock = MockJobLock.parse({ jobName: this.#jobName, jobInterval, jobIntervalEndedAt });
      return new Job(this.#jobStore, jobLock);
    }

    let jobLock: BaseJobLock<I> | null;
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

  async #ensureLastJobLock(requestedAt: Date): Promise<BaseJobLock<I>> {
    let lastJobLock: BaseJobLock<I> | null;
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
      let requiredJobLock: BaseJobLock<I> | null;

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
