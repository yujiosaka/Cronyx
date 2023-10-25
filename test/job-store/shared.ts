import { afterEach, beforeEach, describe, expect, setSystemTime, test } from "bun:test";
import { addHours, subMilliseconds } from "date-fns";
import type BaseJobLock from "../../src/job-lock";
import type BaseJobStore from "../../src/job-store";

export function testBehavesLikeJobStore<I>(getJobStore: () => BaseJobStore<I>) {
  const jobName = "jobName";
  const jobIntervalStartedAt = new Date();
  const jobIntervalEndedAt = addHours(jobIntervalStartedAt, 1);
  const jobInterval = 1000 * 60 * 60; // 1 hour
  const retryInterval = 1000 * 60 * 60 * 2; // 2 hours

  let jobStore: BaseJobStore<I>;
  let retryIntervalStartedAt: Date;

  beforeEach(() => {
    jobStore = getJobStore();
    retryIntervalStartedAt = subMilliseconds(new Date(), retryInterval);
  });

  test("activates a job lock", async () => {
    const jobLock = (await jobStore.activateJobLock(jobName, jobInterval, jobIntervalEndedAt, retryIntervalStartedAt))!;
    expect(jobLock.jobName).toBe(jobName);
    expect(jobLock.jobInterval).toBe(jobInterval);
    expect(jobLock.isActive).toBe(true);
    expect(jobLock.jobIntervalEndedAt.getTime()).toBe(jobIntervalEndedAt.getTime());
    expect(jobLock.createdAt).toBeDate();
    expect(jobLock.updatedAt).toBeDate();
  });

  describe("after activating a job lock", () => {
    let jobLock: BaseJobLock<I>;

    beforeEach(async () => {
      jobLock = (await jobStore.activateJobLock(jobName, jobInterval, jobIntervalEndedAt, retryIntervalStartedAt))!;
    });

    test("finds the activated job lock", async () => {
      const activatedJobLock = (await jobStore.fetchLastJobLock(jobName))!;
      expect(activatedJobLock.jobName).toBe(jobName);
      expect(activatedJobLock.jobInterval).toBe(jobInterval);
      expect(activatedJobLock.isActive).toBe(true);
      expect(activatedJobLock.jobIntervalEndedAt.getTime()).toBe(jobLock.jobIntervalEndedAt.getTime());
      expect(activatedJobLock.createdAt.getTime()).toBe(jobLock.createdAt.getTime());
      expect(activatedJobLock.updatedAt.getTime()).toBe(jobLock.updatedAt.getTime());
    });

    test("fails to reactivate the activated job lock", async () => {
      const reactivatedJobLock = await jobStore.activateJobLock(
        jobName,
        jobInterval,
        jobIntervalEndedAt,
        retryIntervalStartedAt,
      );
      expect(reactivatedJobLock).toBeNull();
    });

    test("deactivates the job lock", async () => {
      const deactivatedJobLock = await jobStore.deactivateJobLock(jobLock.jobName, jobLock._id!);
      expect(deactivatedJobLock.jobName).toBe(jobName);
      expect(deactivatedJobLock.jobInterval).toBe(jobInterval);
      expect(deactivatedJobLock.isActive).toBe(false);
      expect(deactivatedJobLock.jobIntervalEndedAt.getTime()).toBe(jobLock.jobIntervalEndedAt.getTime());
      expect(deactivatedJobLock.createdAt.getTime()).toBe(jobLock.createdAt.getTime());
      expect(deactivatedJobLock.updatedAt.getTime()).toBeGreaterThanOrEqual(jobLock.updatedAt.getTime());
    });

    describe("after deactivating the job lock", () => {
      beforeEach(async () => {
        await jobStore.deactivateJobLock(jobLock.jobName, jobLock._id!);
      });

      test("finds the deactivated job lock", async () => {
        const deactivatedJobLock = (await jobStore.fetchLastJobLock(jobName))!;
        expect(deactivatedJobLock.jobName).toBe(jobName);
        expect(deactivatedJobLock.jobInterval).toBe(jobInterval);
        expect(deactivatedJobLock.isActive).toBe(false);
        expect(deactivatedJobLock.jobIntervalEndedAt.getTime()).toBe(jobLock.jobIntervalEndedAt.getTime());
        expect(deactivatedJobLock.createdAt.getTime()).toBe(jobLock.createdAt.getTime());
        expect(deactivatedJobLock.updatedAt.getTime()).toBeGreaterThanOrEqual(jobLock.updatedAt.getTime());
      });

      test("fails to reactivate the deactivated job lock", async () => {
        const reactivatedJobLock = await jobStore.activateJobLock(
          jobName,
          jobInterval,
          jobIntervalEndedAt,
          retryIntervalStartedAt,
        );
        expect(reactivatedJobLock).toBeNull();
      });
    });

    describe("after removing the job lock", () => {
      beforeEach(async () => {
        await jobStore.removeJobLock(jobLock.jobName, jobLock._id!);
      });

      test("does not find the removed job lock", async () => {
        const removedJobLock = await jobStore.fetchLastJobLock(jobName);
        expect(removedJobLock).toBeNull();
      });

      test("fails to deactivate the removed job lock", async () => {
        await expect(jobStore.deactivateJobLock(jobLock.jobName, jobLock._id!)).rejects.toMatchObject({
          message: "Cannot find job lock for jobName",
        });
      });

      test("fails to remove the removed job lock", async () => {
        await expect(jobStore.removeJobLock(jobLock.jobName, jobLock._id!)).rejects.toMatchObject({
          message: "Cannot find job lock for jobName",
        });
      });
    });

    describe("after retry interval", () => {
      beforeEach(() => {
        setSystemTime(addHours(jobIntervalStartedAt, 3));
        retryIntervalStartedAt = subMilliseconds(new Date(), retryInterval);
      });

      afterEach(() => {
        setSystemTime();
      });

      test("reactivates the job lock", async () => {
        const reactivatedJobLock = (await jobStore.activateJobLock(
          jobName,
          jobInterval,
          jobIntervalEndedAt,
          retryIntervalStartedAt,
        ))!;
        expect(reactivatedJobLock.jobName).toBe(jobName);
        expect(reactivatedJobLock.jobInterval).toBe(jobInterval);
        expect(reactivatedJobLock.isActive).toBe(true);
        expect(reactivatedJobLock.jobIntervalEndedAt.getTime()).toBe(jobLock.jobIntervalEndedAt.getTime());
        expect(reactivatedJobLock.createdAt.getTime()).toBe(jobLock.createdAt.getTime());
        expect(reactivatedJobLock.updatedAt.getTime()).toBeGreaterThanOrEqual(jobLock.updatedAt.getTime());
      });

      describe("after deactivating the job lock", () => {
        beforeEach(async () => {
          await jobStore.deactivateJobLock(jobLock.jobName, jobLock._id!);
        });

        test("fails to reactivate the deactivated job lock", async () => {
          const reactivatedJobLock = await jobStore.activateJobLock(
            jobName,
            jobInterval,
            jobIntervalEndedAt,
            retryIntervalStartedAt,
          );
          expect(reactivatedJobLock).toBeNull();
        });
      });
    });
  });
}
