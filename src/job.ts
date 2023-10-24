import { subMilliseconds } from "date-fns";
import type { Source } from ".";
import { CronyxError } from "./error";
import type BaseJobLock from "./job-lock/base";
import type { JobLockId } from "./job-lock/base";
import type BaseJobStore from "./job-store/base";
import { log } from "./util";

/**
 * @public
 */
export default class Job<S extends Source> {
  #jobName: string;
  #jobStore: BaseJobStore<S>;
  #jobLock: BaseJobLock<JobLockId<S>> | null;
  #pendingPromise: Promise<void> | null = null;

  /**
   * @internal
   */
  constructor(jobStore: BaseJobStore<S>, jobLock: BaseJobLock<JobLockId<S>>) {
    this.#jobName = jobLock.jobName;
    this.#jobStore = jobStore;
    this.#jobLock = jobLock;
  }

  get id(): JobLockId<S> | null {
    if (!this.#jobLock || !this.#jobLock.isActive) throw new CronyxError(`Job is not active for ${this.#jobName}`);

    return this.#jobLock._id;
  }

  get interval(): number {
    if (!this.#jobLock || !this.#jobLock.isActive) throw new CronyxError(`Job is not active for ${this.#jobName}`);

    return this.#jobLock.jobInterval;
  }

  get intervalStartedAt(): Date {
    if (!this.#jobLock || !this.#jobLock.isActive) throw new CronyxError(`Job is not active for ${this.#jobName}`);

    return subMilliseconds(this.#jobLock.jobIntervalEndedAt, this.#jobLock.jobInterval);
  }

  get intervalEndedAt(): Date {
    if (!this.#jobLock || !this.#jobLock.isActive) throw new CronyxError(`Job is not active for ${this.#jobName}`);

    return this.#jobLock.jobIntervalEndedAt;
  }

  async finish(): Promise<void> {
    if (!this.#jobLock || !this.#jobLock.isActive) throw new CronyxError(`Job is not active for ${this.#jobName}`);
    if (this.#pendingPromise) throw new CronyxError(`Job is pending for ${this.#jobName}`);

    if (this.#jobLock._id === null) {
      this.#jobLock = { ...this.#jobLock, isActive: false };
      return;
    }

    this.#pendingPromise = this.#jobStore
      .deactivateJobLock(this.#jobLock.jobName, this.#jobLock._id)
      .then((jobLock) => {
        log(`Job is finished for ${this.#jobName}`);
        this.#jobLock = jobLock;
        this.#pendingPromise = null;
      })
      .catch((error) => {
        this.#pendingPromise = null;
        throw new CronyxError(`Cannot finish job for ${this.#jobName}`, { cause: error });
      });

    return this.#pendingPromise;
  }

  async interrupt(): Promise<void> {
    if (!this.#jobLock || !this.#jobLock.isActive) throw new CronyxError(`Job is not active for ${this.#jobName}`);
    if (this.#pendingPromise) throw new CronyxError(`Job is pending for ${this.#jobName}`);

    if (this.#jobLock._id === null) {
      this.#jobLock = null;
      return;
    }

    this.#pendingPromise = this.#jobStore
      .removeJobLock(this.#jobLock.jobName, this.#jobLock._id)
      .then(() => {
        log(`Job is interrupted for ${this.#jobName}`);
        this.#jobLock = null;
        this.#pendingPromise = null;
      })
      .catch((error) => {
        this.#pendingPromise = null;
        throw new CronyxError(`Cannot interrupt job for ${this.#jobName}`, { cause: error });
      });

    return this.#pendingPromise;
  }
}
