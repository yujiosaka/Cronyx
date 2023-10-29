import { afterEach, beforeAll, beforeEach, expect, Mock, mock, setSystemTime, test } from "bun:test";
import { add, sub } from "date-fns";
import Cronyx from "../../src";
import type { JobLockId } from "../../src";
import type BaseJobStore from "../../src/job-store";

export function testBehavesLikeCronyx<S extends BaseJobStore<I>, I = JobLockId<S>>(getJobStore: () => S) {
  const requestedAt = new Date("2023-02-03T15:00:00.000Z");
  const firstJobIntervalStartedAt = sub(requestedAt, { days: 1 });
  const firstJobIntervalEndedAt = requestedAt;
  const secondJobIntervalStartedAt = requestedAt;
  const secondJobIntervalEndedAt = add(requestedAt, { days: 1 });
  const timezone = "Asia/Tokyo";
  const jobName = "jobName";
  const jobOptions = {
    jobName,
    jobInterval: "0 0 0 * * *", // daily
    startBuffer: { minutes: 30 },
    retryInterval: { days: 1 },
  };
  const requiredJobOptions = {
    jobName: "requiredJobName",
    jobInterval: "0 0 * * * *", // hourly
  };

  let jobStore: S;
  let cronyx: Cronyx<S, I>;
  let jobTask: Mock<() => Promise<void>>;
  let requiredJobTask: Mock<() => Promise<void>>;

  beforeAll(() => {
    jobStore = getJobStore();
    cronyx = new Cronyx({ jobStore, timezone });
  });

  beforeEach(() => {
    jobTask = mock(() => Promise.resolve());
    requiredJobTask = mock(() => Promise.resolve());
    setSystemTime(requestedAt);
  });

  afterEach(async () => {
    setSystemTime();
  });

  test("does not run next job before start buffer", async () => {
    // first job
    const firstJob = await cronyx.requestJobStart(jobOptions);
    expect(firstJob?.id).not.toBe(null);
    expect(firstJob?.name).toBe(jobName);
    expect(firstJob?.interval).toBe(1000 * 60 * 60 * 24); // 1 day
    expect(firstJob?.intervalStartedAt.getTime()).toBe(firstJobIntervalStartedAt.getTime());
    expect(firstJob?.intervalEndedAt.getTime()).toBe(firstJobIntervalEndedAt.getTime());
    expect(firstJob?.isActive).toBe(true);
    expect(firstJob?.createdAt).toBeDate();
    expect(firstJob?.updatedAt).toBeDate();
    await firstJob!.finish();

    setSystemTime(add(requestedAt, { days: 1 }));

    // second job before start buffer
    const secondJobBeforeStartBuffer = await cronyx.requestJobStart(jobOptions);
    expect(secondJobBeforeStartBuffer).toBe(null);

    setSystemTime(add(requestedAt, { days: 1, minutes: 30 }));

    // second job after start buffer
    const secondJobAfterStartBuffer = await cronyx.requestJobStart(jobOptions);
    expect(secondJobAfterStartBuffer?.id).not.toBe(null);
    expect(secondJobAfterStartBuffer?.name).toBe(jobName);
    expect(secondJobAfterStartBuffer?.interval).toBe(1000 * 60 * 60 * 24); // 1 day
    expect(secondJobAfterStartBuffer?.intervalStartedAt.getTime()).toBe(secondJobIntervalStartedAt.getTime());
    expect(secondJobAfterStartBuffer?.intervalEndedAt.getTime()).toBe(secondJobIntervalEndedAt.getTime());
    expect(secondJobAfterStartBuffer?.isActive).toBe(true);
    expect(secondJobAfterStartBuffer?.createdAt).toBeDate();
    expect(secondJobAfterStartBuffer?.updatedAt).toBeDate();
    await secondJobAfterStartBuffer!.finish();
  });

  test("reruns job after interruption", async () => {
    // first job with interruption
    const firstJobWithInterruption = await cronyx.requestJobStart(jobOptions);
    expect(firstJobWithInterruption?.id).not.toBe(null);
    expect(firstJobWithInterruption?.name).toBe(jobName);
    expect(firstJobWithInterruption?.interval).toBe(1000 * 60 * 60 * 24); // 1 day
    expect(firstJobWithInterruption?.intervalStartedAt.getTime()).toBe(firstJobIntervalStartedAt.getTime());
    expect(firstJobWithInterruption?.intervalEndedAt.getTime()).toBe(firstJobIntervalEndedAt.getTime());
    expect(firstJobWithInterruption?.isActive).toBe(true);
    expect(firstJobWithInterruption?.createdAt).toBeDate();
    expect(firstJobWithInterruption?.updatedAt).toBeDate();
    await firstJobWithInterruption!.interrupt();

    // first job
    const firstJob = await cronyx.requestJobStart(jobOptions);
    expect(firstJob?.id).not.toBe(null);
    expect(firstJob?.name).toBe(jobName);
    expect(firstJob?.interval).toBe(1000 * 60 * 60 * 24); // 1 day
    expect(firstJob?.intervalStartedAt.getTime()).toBe(firstJobIntervalStartedAt.getTime());
    expect(firstJob?.intervalEndedAt.getTime()).toBe(firstJobIntervalEndedAt.getTime());
    expect(firstJob?.isActive).toBe(true);
    expect(firstJob?.createdAt).toBeDate();
    expect(firstJob?.updatedAt).toBeDate();
    await firstJob!.finish();
  });

  test("reruns job after retry interval", async () => {
    // first job without finish
    const firstJobWithoutFinish = await cronyx.requestJobStart(jobOptions);
    expect(firstJobWithoutFinish?.id).not.toBe(null);
    expect(firstJobWithoutFinish?.name).toBe(jobName);
    expect(firstJobWithoutFinish?.interval).toBe(1000 * 60 * 60 * 24); // 1 day
    expect(firstJobWithoutFinish?.intervalStartedAt.getTime()).toBe(firstJobIntervalStartedAt.getTime());
    expect(firstJobWithoutFinish?.intervalEndedAt.getTime()).toBe(firstJobIntervalEndedAt.getTime());
    expect(firstJobWithoutFinish?.isActive).toBe(true);
    expect(firstJobWithoutFinish?.createdAt).toBeDate();
    expect(firstJobWithoutFinish?.updatedAt).toBeDate();

    // first job before retry interval
    const firstJobBeforeRetryInterval = await cronyx.requestJobStart(jobOptions);
    expect(firstJobBeforeRetryInterval).toBe(null);

    setSystemTime(add(requestedAt, { days: 2 }));

    // first job after retry interval
    const firstJobAfterRetryInterval = await cronyx.requestJobStart(jobOptions);
    expect(firstJobAfterRetryInterval?.id).not.toBe(null);
    expect(firstJobAfterRetryInterval?.name).toBe(jobName);
    expect(firstJobAfterRetryInterval?.interval).toBe(1000 * 60 * 60 * 24); // 1 day
    expect(firstJobAfterRetryInterval?.intervalStartedAt.getTime()).toBe(firstJobIntervalStartedAt.getTime());
    expect(firstJobAfterRetryInterval?.intervalEndedAt.getTime()).toBe(firstJobIntervalEndedAt.getTime());
    expect(firstJobAfterRetryInterval?.isActive).toBe(true);
    expect(firstJobAfterRetryInterval?.createdAt).toBeDate();
    expect(firstJobAfterRetryInterval?.updatedAt).toBeDate();
    await firstJobAfterRetryInterval!.finish();
  });

  test("runs job with no lock", async () => {
    // first job without finish
    const firstJobWithoutFinish = await cronyx.requestJobStart({ ...jobOptions, noLock: true });
    expect(firstJobWithoutFinish?.id).toBe(null);
    expect(firstJobWithoutFinish?.name).toBe(jobName);
    expect(firstJobWithoutFinish?.interval).toBe(1000 * 60 * 60 * 24); // 1 day
    expect(firstJobWithoutFinish?.intervalStartedAt.getTime()).toBe(firstJobIntervalStartedAt.getTime());
    expect(firstJobWithoutFinish?.intervalEndedAt.getTime()).toBe(firstJobIntervalEndedAt.getTime());
    expect(firstJobWithoutFinish?.isActive).toBe(true);
    expect(firstJobWithoutFinish?.createdAt).toBeDate();
    expect(firstJobWithoutFinish?.updatedAt).toBeDate();

    // first job with interruption
    const firstJobWithFinish = await cronyx.requestJobStart({ ...jobOptions, noLock: true });
    expect(firstJobWithFinish?.id).toBe(null);
    expect(firstJobWithFinish?.name).toBe(jobName);
    expect(firstJobWithFinish?.interval).toBe(1000 * 60 * 60 * 24); // 1 day
    expect(firstJobWithFinish?.intervalStartedAt.getTime()).toBe(firstJobIntervalStartedAt.getTime());
    expect(firstJobWithFinish?.intervalEndedAt.getTime()).toBe(firstJobIntervalEndedAt.getTime());
    expect(firstJobWithFinish?.isActive).toBe(true);
    expect(firstJobWithFinish?.createdAt).toBeDate();
    expect(firstJobWithFinish?.updatedAt).toBeDate();
    await firstJobWithFinish!.interrupt();

    // second job
    const secondJob = await cronyx.requestJobStart({
      ...jobOptions,
      noLock: true,
      jobIntervalStartedAt: secondJobIntervalStartedAt,
    });
    expect(secondJob?.id).toBe(null);
    expect(secondJob?.name).toBe(jobName);
    expect(secondJob?.interval).toBe(1000 * 60 * 60 * 24); // 1 day
    expect(secondJob?.intervalStartedAt.getTime()).toBe(secondJobIntervalStartedAt.getTime());
    expect(secondJob?.intervalEndedAt.getTime()).toBe(secondJobIntervalEndedAt.getTime());
    expect(secondJob?.isActive).toBe(true);
    expect(secondJob?.createdAt).toBeDate();
    expect(secondJob?.updatedAt).toBeDate();
    await secondJob!.finish();
  });

  test("runs job after required jobs fulfilled", async () => {
    // first job with required job not found
    await cronyx.requestJobExec({ ...jobOptions, requiredJobNames: ["requiredJobName"] }, jobTask);
    expect(jobTask).not.toHaveBeenCalled();

    // first required job
    await cronyx.requestJobExec(requiredJobOptions, requiredJobTask);
    expect(requiredJobTask).toHaveBeenCalledTimes(1);

    // first job with required job fulfilled
    await cronyx.requestJobExec({ ...jobOptions, requiredJobNames: ["requiredJobName"] }, jobTask);
    expect(jobTask).toHaveBeenCalledTimes(1);

    setSystemTime(add(requestedAt, { days: 1, minutes: 30 }));

    // required jobs for 23 hours
    for (let i = 1; i < 24; i++) {
      await cronyx.requestJobExec(requiredJobOptions, requiredJobTask);
      expect(requiredJobTask).toHaveBeenCalledTimes(1 + i);
    }

    // second job with required job unfullfilled
    await cronyx.requestJobExec({ ...jobOptions, requiredJobNames: ["requiredJobName"] }, jobTask);
    expect(jobTask).toHaveBeenCalledTimes(1);

    // required jobs 24 hours
    await cronyx.requestJobExec(requiredJobOptions, requiredJobTask);
    expect(requiredJobTask).toHaveBeenCalledTimes(25);

    // second job with required job fulfilled
    await cronyx.requestJobExec({ ...jobOptions, requiredJobNames: ["requiredJobName"] }, jobTask);
    expect(jobTask).toHaveBeenCalledTimes(2);
  });
}
