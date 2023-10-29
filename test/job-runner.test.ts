import { afterEach, beforeEach, describe, expect, Mock, mock, spyOn, test } from "bun:test";
import { addMilliseconds, subMilliseconds } from "date-fns";
import Job from "../src/job";
import RedisJobLock from "../src/job-lock/redis";
import JobRunner from "../src/job-runner";
import BaseJobStore from "../src/job-store";

describe("JobRunner", () => {
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
  const activatedJobLock = { ...lastJobLock, jobIntervalEndedAt, isActive: true };
  const deactivatedJobLock = { ...activatedJobLock, isActive: false, updatedAt: addMilliseconds(now, 1) };
  const fulfilledJobLock = RedisJobLock.parse({
    jobName: "fulfilledJobName",
    jobInterval,
    isActive: false,
    jobIntervalEndedAt,
  });
  const unfulfilledJobLock = { ...fulfilledJobLock, jobName: "unfilfilledJobName", jobIntervalEndedAt };
  const fulfilledActiveJobLock = { ...fulfilledJobLock, jobName: "fulfilledActiveJobName", isActive: true };

  let jobStore: BaseJobStore<string>;
  let failureTask: Mock<() => Promise<void>>;
  let successTask: Mock<() => Promise<void>>;
  let finish: Mock<() => Promise<void>>;
  let interrupt: Mock<() => Promise<void>>;

  beforeEach(() => {
    jobStore = {
      sync: mock(() => Promise.resolve()),
      close: mock(() => Promise.resolve()),
      fetchLastJobLock: mock((jobName) => {
        switch (jobName) {
          case "fulfilledJobName":
            return Promise.resolve(fulfilledJobLock);
          case "unfilfilledJobName":
            return Promise.resolve(unfulfilledJobLock);
          case "fulfilledActiveJobName":
            return Promise.resolve(fulfilledActiveJobLock);
          default:
            return Promise.resolve(lastJobLock);
        }
      }),
      activateJobLock: mock(() => Promise.resolve(activatedJobLock)),
      deactivateJobLock: mock(() => Promise.resolve(deactivatedJobLock)),
      removeJobLock: mock(() => Promise.resolve()),
    };
    failureTask = mock(() => Promise.reject(new Error("job failed")));
    successTask = mock(() => Promise.resolve());
    finish = spyOn(Job.prototype, "finish").mockResolvedValue();
    interrupt = spyOn(Job.prototype, "interrupt").mockResolvedValue();
  });

  afterEach(() => {
    finish.mockRestore();
    interrupt.mockRestore();
  });

  describe("requestJobRun", () => {
    test("runs job", async () => {
      const runner = new JobRunner(jobStore, jobName, jobInterval);
      const job = await runner.requestJobStart();

      expect(job?.id).not.toBe(null);
      expect(job?.name).toBe(jobName);
      expect(job?.interval).toBe(jobInterval);
      expect(job?.intervalStartedAt.getTime()).toBe(jobIntervalStartedAt.getTime());
      expect(job?.intervalEndedAt.getTime()).toBe(jobIntervalEndedAt.getTime());
      expect(job?.createdAt).toBeDate();
      expect(job?.updatedAt).toBeDate();
      expect(jobStore.fetchLastJobLock).toHaveBeenCalledTimes(1);
      expect(jobStore.activateJobLock).toHaveBeenCalled();
    });

    test("runs job when last job lock is not found", async () => {
      jobStore.fetchLastJobLock = mock(() => Promise.resolve(null));

      const runner = new JobRunner(jobStore, jobName, jobInterval);
      const job = await runner.requestJobStart();

      expect(job?.id).not.toBe(null);
      expect(job?.name).toBe(jobName);
      expect(job?.interval).toBe(jobInterval);
      expect(job?.intervalStartedAt.getTime()).toBe(jobIntervalStartedAt.getTime());
      expect(job?.intervalEndedAt.getTime()).toBe(jobIntervalEndedAt.getTime());
      expect(job?.createdAt).toBeDate();
      expect(job?.updatedAt).toBeDate();
      expect(jobStore.fetchLastJobLock).toHaveBeenCalledTimes(1);
      expect(jobStore.activateJobLock).toHaveBeenCalled();
    });

    test("does not run job when last job lock is active", async () => {
      jobStore.fetchLastJobLock = mock(() => Promise.resolve(activatedJobLock));

      const runner = new JobRunner(jobStore, jobName, jobInterval);
      const job = await runner.requestJobStart();

      expect(job).toBe(null);
      expect(jobStore.fetchLastJobLock).toHaveBeenCalledTimes(1);
      expect(jobStore.activateJobLock).not.toHaveBeenCalled();
    });

    test("runs job with fulfilled job requirement", async () => {
      const runner = new JobRunner(jobStore, jobName, jobInterval, { requiredJobNames: ["fulfilledJobName"] });
      const job = await runner.requestJobStart();

      expect(job?.id).not.toBe(null);
      expect(job?.name).toBe(jobName);
      expect(job?.interval).toBe(jobInterval);
      expect(job?.intervalStartedAt.getTime()).toBe(jobIntervalStartedAt.getTime());
      expect(job?.intervalEndedAt.getTime()).toBe(jobIntervalEndedAt.getTime());
      expect(job?.createdAt).toBeDate();
      expect(job?.updatedAt).toBeDate();
      expect(jobStore.fetchLastJobLock).toHaveBeenCalledTimes(2);
      expect(jobStore.activateJobLock).toHaveBeenCalled();
    });

    test("does not run job with unfulfilled job requirement", async () => {
      const runner = new JobRunner(jobStore, jobName, jobInterval, {
        requiredJobNames: ["unfulfilledJobName"],
      });
      const job = await runner.requestJobStart();

      expect(job).toBe(null);
      expect(jobStore.fetchLastJobLock).toHaveBeenCalledTimes(2);
      expect(jobStore.activateJobLock).not.toHaveBeenCalled();
    });

    test("does not run job when required job is active and fulfilled", async () => {
      const runner = new JobRunner(jobStore, jobName, jobInterval, {
        requiredJobNames: ["fulfilledActiveJobName"],
      });
      const job = await runner.requestJobStart();

      expect(job).toBe(null);
      expect(jobStore.fetchLastJobLock).toHaveBeenCalledTimes(2);
      expect(jobStore.activateJobLock).not.toHaveBeenCalled();
    });

    test("does not run job with unfulfilled start buffer", async () => {
      const runner = new JobRunner(jobStore, jobName, jobInterval, { startBuffer: { minutes: 5 } });
      const job = await runner.requestJobStart();

      expect(job).toBe(null);
      expect(jobStore.fetchLastJobLock).toHaveBeenCalledTimes(1);
      expect(jobStore.activateJobLock).not.toHaveBeenCalled();
    });

    test("runs job when last job lock is active and after retry interval", async () => {
      jobStore.fetchLastJobLock = mock(() => Promise.resolve(activatedJobLock));

      const runner = new JobRunner(jobStore, jobName, jobInterval, { retryInterval: 0 });
      const job = await runner.requestJobStart();

      expect(job?.id).not.toBe(null);
      expect(job?.name).toBe(jobName);
      expect(job?.interval).toBe(jobInterval);
      expect(job?.intervalStartedAt.getTime()).toBe(jobIntervalStartedAt.getTime());
      expect(job?.intervalEndedAt.getTime()).toBe(jobIntervalEndedAt.getTime());
      expect(job?.createdAt).toBeDate();
      expect(job?.updatedAt).toBeDate();
      expect(jobStore.fetchLastJobLock).toHaveBeenCalledTimes(1);
      expect(jobStore.activateJobLock).toHaveBeenCalled();
    });

    test("runs job with no lock", async () => {
      const runner = new JobRunner(jobStore, jobName, jobInterval, { noLock: true });
      const job = await runner.requestJobStart();

      expect(job?.id).toBe(null);
      expect(job?.name).toBe(jobName);
      expect(job?.interval).toBe(jobInterval);
      expect(job?.intervalStartedAt.getTime()).toBe(jobIntervalStartedAt.getTime());
      expect(job?.intervalEndedAt.getTime()).toBe(jobIntervalEndedAt.getTime());
      expect(job?.createdAt).toBeDate();
      expect(job?.updatedAt).toBeDate();
      expect(jobStore.fetchLastJobLock).toHaveBeenCalledTimes(1);
      expect(jobStore.activateJobLock).not.toHaveBeenCalled();
    });

    test("runs job with no lock and job interval starting date", async () => {
      const runner = new JobRunner(jobStore, jobName, jobInterval, { noLock: true, jobIntervalStartedAt });
      const job = await runner.requestJobStart();

      expect(job?.id).toBe(null);
      expect(job?.name).toBe(jobName);
      expect(job?.interval).toBe(jobInterval);
      expect(job?.intervalStartedAt.getTime()).toBe(jobIntervalStartedAt.getTime());
      expect(job?.intervalEndedAt.getTime()).toBe(jobIntervalEndedAt.getTime());
      expect(job?.createdAt).toBeDate();
      expect(job?.updatedAt).toBeDate();
      expect(jobStore.fetchLastJobLock).not.toHaveBeenCalledTimes(1);
      expect(jobStore.activateJobLock).not.toHaveBeenCalled();
    });
  });

  describe("requestJobExec", () => {
    test("interrupts task when task is failed", async () => {
      const runner = new JobRunner(jobStore, jobName, jobInterval);
      await expect(runner.requestJobExec(failureTask)).rejects.toMatchObject({
        message: "job failed",
      });

      expect(failureTask).toHaveBeenCalledTimes(1);
      expect(jobStore.fetchLastJobLock).toHaveBeenCalledTimes(1);
      expect(jobStore.activateJobLock).toHaveBeenCalled();
      expect(finish).not.toHaveBeenCalled();
      expect(interrupt).toHaveBeenCalled();
    });

    test("finishes task", async () => {
      const runner = new JobRunner(jobStore, jobName, jobInterval);
      await runner.requestJobExec(successTask);

      expect(successTask).toHaveBeenCalledTimes(1);
      expect(jobStore.fetchLastJobLock).toHaveBeenCalledTimes(1);
      expect(jobStore.activateJobLock).toHaveBeenCalled();
      expect(finish).toHaveBeenCalled();
      expect(interrupt).not.toHaveBeenCalled();
    });

    test("finishes task when last job lock is not found", async () => {
      jobStore.fetchLastJobLock = mock(() => Promise.resolve(null));

      const runner = new JobRunner(jobStore, jobName, jobInterval);
      await runner.requestJobExec(successTask);

      expect(successTask).toHaveBeenCalledTimes(1);
      expect(jobStore.fetchLastJobLock).toHaveBeenCalledTimes(1);
      expect(jobStore.activateJobLock).toHaveBeenCalled();
      expect(finish).toHaveBeenCalled();
      expect(interrupt).not.toHaveBeenCalled();
    });

    test("does not finish task when last job lock is active", async () => {
      jobStore.fetchLastJobLock = mock(() => Promise.resolve(activatedJobLock));

      const runner = new JobRunner(jobStore, jobName, jobInterval);
      await runner.requestJobExec(successTask);

      expect(successTask).not.toHaveBeenCalled();
      expect(jobStore.fetchLastJobLock).toHaveBeenCalledTimes(1);
      expect(jobStore.activateJobLock).not.toHaveBeenCalled();
      expect(finish).not.toHaveBeenCalled();
      expect(interrupt).not.toHaveBeenCalled();
    });

    test("finishes task with fulfilled job requirement", async () => {
      const runner = new JobRunner(jobStore, jobName, jobInterval, { requiredJobNames: ["fulfilledJobName"] });
      await runner.requestJobExec(successTask);

      expect(successTask).toHaveBeenCalledTimes(1);
      expect(jobStore.fetchLastJobLock).toHaveBeenCalledTimes(2);
      expect(jobStore.activateJobLock).toHaveBeenCalled();
      expect(finish).toHaveBeenCalled();
      expect(interrupt).not.toHaveBeenCalled();
    });

    test("does not finish task with unfulfilled job requirement", async () => {
      const runner = new JobRunner(jobStore, jobName, jobInterval, {
        requiredJobNames: ["unfulfilledJobName"],
      });
      await runner.requestJobExec(successTask);

      expect(successTask).not.toHaveBeenCalled();
      expect(jobStore.fetchLastJobLock).toHaveBeenCalledTimes(2);
      expect(jobStore.activateJobLock).not.toHaveBeenCalled();
      expect(finish).not.toHaveBeenCalled();
      expect(interrupt).not.toHaveBeenCalled();
    });

    test("does not finish task when required job is active and fulfilled", async () => {
      const runner = new JobRunner(jobStore, jobName, jobInterval, {
        requiredJobNames: ["fulfilledActiveJobName"],
      });
      await runner.requestJobExec(successTask);

      expect(successTask).not.toHaveBeenCalled();
      expect(jobStore.fetchLastJobLock).toHaveBeenCalledTimes(2);
      expect(jobStore.activateJobLock).not.toHaveBeenCalled();
      expect(finish).not.toHaveBeenCalled();
      expect(interrupt).not.toHaveBeenCalled();
    });

    test("does not finish task with unfulfilled start buffer", async () => {
      const runner = new JobRunner(jobStore, jobName, jobInterval, { startBuffer: { minutes: 5 } });
      await runner.requestJobExec(successTask);

      expect(successTask).not.toHaveBeenCalled();
      expect(jobStore.fetchLastJobLock).toHaveBeenCalledTimes(1);
      expect(jobStore.activateJobLock).not.toHaveBeenCalled();
      expect(finish).not.toHaveBeenCalled();
      expect(interrupt).not.toHaveBeenCalled();
    });

    test("finishes task when last job lock is active and after retry interval", async () => {
      jobStore.fetchLastJobLock = mock(() => Promise.resolve(activatedJobLock));

      const runner = new JobRunner(jobStore, jobName, jobInterval, { retryInterval: 0 });
      await runner.requestJobExec(successTask);

      expect(successTask).toHaveBeenCalledTimes(1);
      expect(jobStore.fetchLastJobLock).toHaveBeenCalledTimes(1);
      expect(jobStore.activateJobLock).toHaveBeenCalled();
      expect(finish).toHaveBeenCalled();
      expect(interrupt).not.toHaveBeenCalled();
    });

    test("finishes task with no lock", async () => {
      const runner = new JobRunner(jobStore, jobName, jobInterval, { noLock: true });
      await runner.requestJobExec(successTask);

      expect(successTask).toHaveBeenCalledTimes(1);
      expect(jobStore.fetchLastJobLock).toHaveBeenCalledTimes(1);
      expect(jobStore.activateJobLock).not.toHaveBeenCalled();
      expect(finish).toHaveBeenCalled();
      expect(interrupt).not.toHaveBeenCalled();
    });

    test("finishes task with no lock and job interval starting date", async () => {
      const runner = new JobRunner(jobStore, jobName, jobInterval, { noLock: true, jobIntervalStartedAt });
      await runner.requestJobExec(successTask);

      expect(successTask).toHaveBeenCalledTimes(1);
      expect(jobStore.fetchLastJobLock).not.toHaveBeenCalledTimes(1);
      expect(jobStore.activateJobLock).not.toHaveBeenCalled();
      expect(finish).toHaveBeenCalled();
      expect(interrupt).not.toHaveBeenCalled();
    });
  });
});
