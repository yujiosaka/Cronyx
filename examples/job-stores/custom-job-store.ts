#!/usr/bin/env bun
import { isEqual } from "date-fns";
import { v4 } from "uuid";
import Cronyx, { BaseJobLock } from "../../src";
import type BaseJobStore from "../../src/job-store";

// Create a new cache by extending BaseJobStore interface
export default class MemoryJobStore implements BaseJobStore<string> {
  #jobLocks: Record<string, BaseJobLock<string>[]>;

  constructor() {
    this.#jobLocks = {};
  }

  static async connect(): Promise<MemoryJobStore> {
    return new MemoryJobStore();
  }

  async close(): Promise<void> {}

  async fetchLastJobLock(jobName: string): Promise<BaseJobLock<string> | null> {
    const jobLocks = this.#jobLocks[jobName] ?? [];
    const lastJobLock = jobLocks[jobLocks.length - 1];
    return lastJobLock ?? null;
  }

  async activateJobLock(
    jobName: string,
    jobInterval: number,
    jobIntervalEndedAt: Date,
    retryIntervalStartedAt: Date,
  ): Promise<BaseJobLock<string> | null> {
    const now = new Date();

    const lastJobLock = await this.fetchLastJobLock(jobName);
    if (lastJobLock) {
      if (lastJobLock.isActive) {
        if (lastJobLock.updatedAt <= retryIntervalStartedAt) {
          const reactivatedJobLock = { ...lastJobLock, jobInterval, updatedAt: now };
          this.#jobLocks[jobName].splice(-1, 1, reactivatedJobLock);

          return reactivatedJobLock;
        }
        return null;
      }

      if (isEqual(lastJobLock.jobIntervalEndedAt, jobIntervalEndedAt)) {
        return null;
      }
    }

    const activatedJobLock = {
      _id: v4(),
      jobName,
      jobIntervalEndedAt,
      jobInterval,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.#jobLocks[jobName] = this.#jobLocks[jobName] ?? [];
    this.#jobLocks[jobName].push(activatedJobLock);

    return activatedJobLock;
  }

  async deactivateJobLock(jobName: string, jobId: string): Promise<BaseJobLock<string>> {
    const lastJobLock = await this.fetchLastJobLock(jobName);
    if (!lastJobLock || !lastJobLock.isActive || lastJobLock._id !== jobId) {
      throw new Error(`Cannot find job lock for ${jobName}`);
    }

    const detivatedJobLock = { ...lastJobLock, isActive: false, updatedAt: new Date() };
    this.#jobLocks[jobName].splice(-1, 1, detivatedJobLock);

    return detivatedJobLock;
  }

  async removeJobLock(jobName: string, jobId: string): Promise<void> {
    const lastJobLock = await this.fetchLastJobLock(jobName);
    if (!lastJobLock || lastJobLock._id !== jobId) {
      throw new Error(`Cannot find job lock for ${jobName}`);
    }

    this.#jobLocks[jobName].pop();
  }
}

const jobStore = new MemoryJobStore();
const cronyx = new Cronyx({ jobStore });
const job = await cronyx.requestJobStart({
  jobName: "hourly-job",
  jobInterval: "0 * * * *",
});

if (job) {
  try {
    console.log(job.intervalStartedAt);
    console.log(job.intervalEndedAt);
    await job.finish();
  } catch {
    await job.interrupt();
  }
}
