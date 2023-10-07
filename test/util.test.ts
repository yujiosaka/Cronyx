import { describe, expect, test } from "bun:test";
import { subMilliseconds } from "date-fns";
import RedisJobLock from "../src/job-lock/redis";
import { addInterval, getLastDeactivatedJobIntervalEndedAt, hasErrorCode, isDuration, subInterval } from "../src/util";

describe("isDuration", () => {
  test("returns true for an empty object", () => {
    expect(isDuration({})).toBe(true);
  });

  test("returns true for valid duration objects", () => {
    expect(isDuration({ hours: 1 })).toBe(true);
    expect(isDuration({ hours: 1, minutes: 30 })).toBe(true);
    expect(isDuration({ hours: 1, minutes: undefined })).toBe(true);
  });

  test("returns true for objects with undefined values", () => {
    expect(isDuration({ hours: undefined })).toBe(true);
    expect(isDuration({ hours: 1, minutes: undefined })).toBe(true);
  });

  test("returns false for objects with invalid keys", () => {
    expect(isDuration({ animals: 3 })).toBe(false);
  });

  test("returns false for objects with non-numeric values", () => {
    expect(isDuration({ hours: "1" })).toBe(false);
    expect(isDuration({ hours: null })).toBe(false);
    expect(isDuration({ hours: {} })).toBe(false);
    expect(isDuration({ hours: [] })).toBe(false);
  });

  test("returns false for non-object values", () => {
    expect(isDuration(123)).toBe(false);
    expect(isDuration("1 hour")).toBe(false);
    expect(isDuration(null)).toBe(false);
    expect(isDuration(undefined)).toBe(false);
  });
});

describe("addInterval", () => {
  const date = new Date("2023-03-12T06:00:00.000Z"); // Daylight Saving Time starts in New York
  const timezone = "America/New_York";

  test("adds the numeric interval", () => {
    const interval = 1000 * 60 * 60 * 24; // 1 day
    expect(addInterval(date, interval, timezone)).toEqual(new Date("2023-03-13T06:00:00.000Z"));
  });

  test("fails to add invalid cron expression interval", () => {
    expect(() => addInterval(date, "invalid", timezone)).toThrow("Cannot parse cron expression for invalid");
  });

  test("adds the cron expression interval", () => {
    expect(addInterval(date, "* * * * * *", timezone)).toEqual(new Date("2023-03-12T06:00:01.000Z"));
    expect(addInterval(date, "0 * * * * *", timezone)).toEqual(new Date("2023-03-12T06:01:00.000Z"));
    expect(addInterval(date, "0 0 * * * *", timezone)).toEqual(new Date("2023-03-12T07:00:00.000Z"));
    expect(addInterval(date, "0 0 0 * * *", timezone)).toEqual(new Date("2023-03-13T04:00:00.000Z"));
    expect(addInterval(date, "0 0 0 1 * *", timezone)).toEqual(new Date("2023-04-01T04:00:00.000Z"));
    expect(addInterval(date, "0 0 0 1 1 *", timezone)).toEqual(new Date("2024-01-01T05:00:00.000Z"));
  });

  test("adds the duration interval", () => {
    const interval = { days: 1 };
    expect(addInterval(date, interval, timezone)).toEqual(new Date("2023-03-13T05:00:00.000Z"));
  });
});

describe("subInterval", () => {
  const date = new Date("2023-11-05T08:00:00.000Z"); // Daylight Saving Time ends in New York
  const timezone = "America/New_York";

  test("subtracts the numeric interval", () => {
    const interval = 1000 * 60 * 60 * 24; // 1 day
    expect(subInterval(date, interval, timezone)).toEqual(new Date("2023-11-04T08:00:00.000Z"));
  });

  test("fails to add invalid cron expression interval", () => {
    expect(() => subInterval(date, "invalid", timezone)).toThrow("Cannot parse cron expression for invalid");
  });

  test("subtracts the cron expression interval", () => {
    expect(subInterval(date, "* * * * * *", timezone)).toEqual(new Date("2023-11-05T07:59:59.000Z"));
    expect(subInterval(date, "0 * * * * *", timezone)).toEqual(new Date("2023-11-05T07:59:00.000Z"));
    expect(subInterval(date, "0 0 * * * *", timezone)).toEqual(new Date("2023-11-05T07:00:00.000Z"));
    expect(subInterval(date, "0 0 0 * * *", timezone)).toEqual(new Date("2023-11-05T04:00:00.000Z"));
    expect(subInterval(date, "0 0 0 1 * *", timezone)).toEqual(new Date("2023-11-01T04:00:00.000Z"));
    expect(subInterval(date, "0 0 0 1 1 *", timezone)).toEqual(new Date("2023-01-01T05:00:00.000Z"));
  });

  test("subtracts the duration interval", () => {
    const interval = { days: 1 };
    expect(subInterval(date, interval, timezone)).toEqual(new Date("2023-11-04T07:00:00.000Z"));
  });
});

describe("getLastDeactivatedJobIntervalEndedAt", () => {
  test("returns job interval starting date when the job is active", () => {
    const jobIntervalEndedAt = new Date();
    const jobInterval = 1000 * 60 * 60; // 1 hour

    const jobLock = RedisJobLock.parse({ jobName: "jobName", jobInterval, jobIntervalEndedAt, isActive: true });
    const result = getLastDeactivatedJobIntervalEndedAt(jobLock);

    const jobIntervalStartedAt = subMilliseconds(jobIntervalEndedAt, jobInterval);
    expect(result).toEqual(jobIntervalStartedAt);
  });

  test("returns job interval ending date when the job is not active", () => {
    const jobIntervalEndedAt = new Date();
    const jobInterval = 1000 * 60 * 60; // 1 hour

    const jobLock = RedisJobLock.parse({ jobName: "jobName", jobInterval, jobIntervalEndedAt, isActive: false });

    const result = getLastDeactivatedJobIntervalEndedAt(jobLock);
    expect(result).toEqual(jobIntervalEndedAt);
  });
});

describe("hasErrorCode", () => {
  test("returns true if error is Error and has error code", () => {
    const error = new Error("duplicate key value violates unique constraint");
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    error.code = "ER_DUP_ENTRY";
    expect(hasErrorCode(error)).toBe(true);
  });

  test("returns false if error is Error but does not have error code", () => {
    const error = new Error("duplicate key value violates unique constraint");
    expect(hasErrorCode(error)).toBe(false);
  });

  test("returns false if error is not Error", () => {
    const error = "duplicate key value violates unique constraint";
    expect(hasErrorCode(error)).toBe(false);
  });
});
