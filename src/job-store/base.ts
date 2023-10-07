import type BaseJobLock from "../job-lock/base";

/**
 * @public
 */
export default interface BaseJobStore<T> {
  close(): Promise<void>;
  fetchLastJobLock(jobName: string): Promise<BaseJobLock<T> | null>;
  activateJobLock(
    jobName: string,
    jobInterval: number,
    jobIntervalEndedAt: Date,
    retryIntervalStartedAt: Date,
  ): Promise<BaseJobLock<T> | null>;
  deactivateJobLock(jobName: string, jobId: T): Promise<BaseJobLock<T>>;
  removeJobLock(jobName: string, jobId: T): Promise<void>;
}
