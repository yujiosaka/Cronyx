import { subMilliseconds } from "date-fns";
import { CronyxError } from "./error";
import type BaseJobLock from "./job-lock";
import type BaseJobStore from "./job-store";
import { log } from "./util";

/**
 * @public
 */
export default class Job<I> {
  #jobName: string;
  #jobStore: BaseJobStore<I>;
  #jobLock: BaseJobLock<I> | null;
  #pendingPromise: Promise<void> | null = null;

  /**
   * @internal
   */
  constructor(jobStore: BaseJobStore<I>, jobLock: BaseJobLock<I>) {
    this.#jobName = jobLock.jobName;
    this.#jobStore = jobStore;
    this.#jobLock = jobLock;
  }

  get id(): I | null {
    if (!this.#jobLock || !this.#jobLock.isActive) throw new CronyxError(`Job is not active for ${this.#jobName}`);

    return this.#jobLock._id;
  }

  get name(): string {
    if (!this.#jobLock || !this.#jobLock.isActive) throw new CronyxError(`Job is not active for ${this.#jobName}`);

    return this.#jobLock.jobName;
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

  get isActive(): boolean {
    if (!this.#jobLock || !this.#jobLock.isActive) throw new CronyxError(`Job is not active for ${this.#jobName}`);

    return true;
  }

  get createdAt(): Date {
    if (!this.#jobLock || !this.#jobLock.isActive) throw new CronyxError(`Job is not active for ${this.#jobName}`);

    return this.#jobLock.createdAt;
  }

  get updatedAt(): Date {
    if (!this.#jobLock || !this.#jobLock.isActive) throw new CronyxError(`Job is not active for ${this.#jobName}`);

    return this.#jobLock.updatedAt;
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
