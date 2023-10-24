import type { Source } from "..";
import type BaseJobLock from "../job-lock/base";
import type { JobLockId } from "../job-lock/base";

/**
 * @public
 */
export default interface BaseJobStore<S extends Source> {
  close(): Promise<void>;
  fetchLastJobLock(jobName: string): Promise<BaseJobLock<JobLockId<S>> | null>;
  activateJobLock(
    jobName: string,
    jobInterval: number,
    jobIntervalEndedAt: Date,
    retryIntervalStartedAt: Date,
  ): Promise<BaseJobLock<JobLockId<S>> | null>;
  deactivateJobLock(jobName: string, jobId: JobLockId<S>): Promise<BaseJobLock<JobLockId<S>>>;
  removeJobLock(jobName: string, jobId: JobLockId<S>): Promise<void>;
}
