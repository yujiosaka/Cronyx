import { beforeEach, describe, expect, mock, test } from "bun:test";
import { addMilliseconds, subMilliseconds } from "date-fns";
import type { Source } from "../src";
import Job from "../src/job";
import RedisJobLock from "../src/job-lock/redis";
import type BaseJobStore from "../src/job-store/base";

describe.each([[false], [true]])("Job", (noLock) => {
  const now = new Date();
  const jobName = "jobName";
  const jobInterval = 1000 * 60 * 60; // 1 hour
  const jobIntervalStartedAt = subMilliseconds(now, jobInterval);
  const jobIntervalEndedAt = now;
  const lastJobLock = RedisJobLock.parse({
    jobName,
    jobInterval,
    jobIntervalEndedAt: jobIntervalStartedAt,
    isActive: false,
  });
  const activatedJobLock = { ...lastJobLock, jobIntervalEndedAt, isActive: true, _id: noLock ? null : lastJobLock._id };
  const deactivatedJobLock = { ...activatedJobLock, isActive: false, updatedAt: addMilliseconds(now, 1) };

  let jobStore: BaseJobStore<Source>;
  let job: Job<Source>;

  beforeEach(() => {
    jobStore = {
      close: mock(() => Promise.resolve()),
      fetchLastJobLock: mock(() => Promise.resolve(lastJobLock)),
      activateJobLock: mock(() => Promise.resolve(activatedJobLock)),
      deactivateJobLock: mock(() => Promise.resolve(deactivatedJobLock)),
      removeJobLock: mock(() => Promise.resolve()),
    };
  });

  describe(`when isLock=${noLock}`, () => {
    beforeEach(() => {
      job = new Job(jobStore, activatedJobLock);
    });

    test("gets an ID", () => {
      expect(job.id).toEqual(activatedJobLock._id);
    });

    test("gets an interval", () => {
      expect(job.interval).toEqual(jobInterval);
    });

    test("gets a interval started date", () => {
      const jobIntervalStartedAt = subMilliseconds(activatedJobLock.jobIntervalEndedAt, activatedJobLock.jobInterval);
      expect(job.intervalStartedAt).toEqual(jobIntervalStartedAt);
    });

    test("gets a interval ended date", () => {
      expect(job.intervalEndedAt).toEqual(activatedJobLock.jobIntervalEndedAt);
    });

    if (!noLock) {
      test("finishes a job", async () => {
        await job.finish();

        expect(jobStore.deactivateJobLock).toHaveBeenCalledTimes(1);
      });

      test("interrupts a job", async () => {
        await job.interrupt();

        expect(jobStore.removeJobLock).toHaveBeenCalledTimes(1);
      });
    }

    describe("after finishing a job", () => {
      beforeEach(async () => {
        await job.finish();
      });

      test("fails to get the ID", () => {
        expect(() => job.id).toThrow("Job is not active for jobName");
      });

      test("fails to get the interval", () => {
        expect(() => job.interval).toThrow("Job is not active for jobName");
      });

      test("fails to get the finished interval started date", () => {
        expect(() => job.intervalStartedAt).toThrow("Job is not active for jobName");
      });

      test("fails to get the finished interval ended date", () => {
        expect(() => job.intervalEndedAt).toThrow("Job is not active for jobName");
      });

      test("fails to finishe the finished job", async () => {
        await expect(job.finish()).rejects.toMatchObject({ message: "Job is not active for jobName" });
      });

      test("fails to interrupt the finished job", async () => {
        await expect(job.interrupt()).rejects.toMatchObject({ message: "Job is not active for jobName" });
      });
    });

    describe("after interrupting a job", () => {
      beforeEach(async () => {
        await job.interrupt();
      });

      test("fails to get the ID", () => {
        expect(() => job.id).toThrow("Job is not active for jobName");
      });

      test("fails to get the interval", () => {
        expect(() => job.interval).toThrow("Job is not active for jobName");
      });

      test("fails to get the interrupted interval started date", () => {
        expect(() => job.intervalStartedAt).toThrow("Job is not active for jobName");
      });

      test("fails to get the interrupted interval ended date", () => {
        expect(() => job.intervalEndedAt).toThrow("Job is not active for jobName");
      });

      test("fails to finishe the interrupted job", async () => {
        await expect(job.finish()).rejects.toMatchObject({ message: "Job is not active for jobName" });
      });

      test("fails to interrupt the interrupted job", async () => {
        await expect(job.interrupt()).rejects.toMatchObject({ message: "Job is not active for jobName" });
      });
    });

    if (!noLock) {
      describe("when deactivating job lock fails", () => {
        beforeEach(() => {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          jobStore.deactivateJobLock.mockReturnValue(Promise.reject(new Error("Deactivation failed")));
        });

        test("fails to finish the job", async () => {
          await expect(job.finish()).rejects.toMatchObject({ message: `Cannot finish job for ${activatedJobLock.jobName}` });
        });
      });

      describe("when removing job lock fails", () => {
        beforeEach(() => {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          jobStore.removeJobLock.mockReturnValue(Promise.reject(new Error("Removal failed")));
        });

        test("fails to interrupt the job", async () => {
          await expect(job.interrupt()).rejects.toMatchObject({
            message: `Cannot interrupt job for ${activatedJobLock.jobName}`,
          });
        });
      });
    }
  });
});
