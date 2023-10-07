# Tips

## Using the `startBuffer` option

Cronyx provides a convenient `startBuffer` option, allowing you to introduce intentional delays before a job starts. This is especially useful when you need to ensure all pre-requisites or data are in place before the task executes.

```ts
const job = await cronyx.requestJobExec({
  jobName: "hourly-job",
  jobInterval: "0 * * * *",
  // date-fns Duration object or number for milliseconds
  startBuffer: { "minutes": 5 },
}, async (job) => { ... })
```

## Understanding `job.intervalStartedAt` and `job.intervalEndedAt`

In Cronyx, `job.intervalStartedAt` and `job.intervalEndedAt` don't necessarily indicate the exact execution times of your job, but rather they represent the original scheduled interval for the job.

Imagine you have a job set with the interval `"0 * * * *"`. Ideally, this job should execute every hour at the start of the hour. However, real-world scenarios can introduce delays:

1. **Previous Jobs and Dependencies**: Delays in previous jobs, dependencies, or other unforeseen circumstances might postpone the actual execution.
2. **Intentional Delays with `startBuffer`**: If you configure the `startBuffer` option, it will introduce a deliberate delay before your job starts. While the job may start later due to the buffer, the interval times remain consistent.

The consistent representation of these interval times ensures that tasks, such as data aggregation, can define periods of interest without being affected by actual execution times or intentional delays. This behavior makes it easier for developers to process and manage their data in alignment with the intended schedule.

## Prevent indefinite job lock

Cronyx offers a `retryInterval` option to handle situations where a job might not complete as expected. This feature ensures that job locks, which could inadvertently prevent successive jobs from running due to unforeseen errors or hang-ups, are not in place indefinitely.

There might be scenarios where:

1. You've manually managed the job lifecycle, but either `job.finish()` or `job.interrupt()` wasn't called due to an error.
2. The process hangs or stalls in the midst of executing the callback.

To illustrate, here's how you can use the `retryInterval` option:

```ts
const job = await cronyx.requestJobExec({
  jobName: "hourly-job",
  jobInterval: "0 * * * *",
  // date-fns Duration object or number for milliseconds
  retryInterval: { "hours": 2 },
}, async (job) => { ... })
```

When you set the `retryInterval`, if the designated period has elapsed since the job was activated and neither `job.finish()` nor `job.interrupt()` were called, Cronyx will allow other processes to bypass the active job lock. This facilitates the rerunning of the script, making sure tasks aren't perpetually halted due to an active lock from a previously hung job.

Use this feature with caution. Setting the `retryInterval` too short can inadvertently cause multiple jobs to run for the same interval, especially if the initial job is just experiencing extended processing times. As a best practice, it's recommended to configure the `retryInterval` to be longer than the `jobInterval` to avoid such overlaps.

## Using the `noLock` Option

The `noLock` option in Cronyx is tailor-made for debugging and dry-run scenarios. When enabled, Cronyx will:

1. **Check Job Due**: Determine if the job is scheduled to run, but won't execute the callback if requirements aren't met.
2. **Skip Lock Activation**: Bypasses job locks, allowing other processes to run the job for the same interval without restrictions.
3. **Avoid Persisting Job Lock Records**: Post-job completion, no lock records are saved, making it as if the job never ran for that interval.

Usage example:

```ts
const job = await cronyx.requestJobExec({
  jobName: "hourly-job",
  jobInterval: "0 * * * *",
  noLock: true,
}, async (job) => { ... })
```

Use Cases:

- **Debugging**: Identify the next job interval without affecting subsequent jobs.
- **Dry Runs**: Test job behavior without impacting actual sequences.

Ensure noLock is used carefully, primarily during testing, and turned off for regular operations.

## Leveraging `jobIntervalStartedAt`

Cronyx provides the `jobIntervalStartedAt` option for specific scenarios. This option allows you to manually set the start interval of a job. However, it's essential to use it in combination with the `noLock` option.

```typescript
const job = await cronyx.requestJobExec({
  jobName: "hourly-job",
  jobInterval: "0 * * * *",
  noLock: true,
  jobIntervalStartedAt: new Date("2024-02-02T15:00:00.000Z"),
}, async (job) => { ... })
```

Key Behaviors:

1. **Job Due Bypass:** It skips the routine check to determine if the job is due to run.
2. **Manual Start Interval:** The value of `job.intervalStartedAt` will match the provided `jobIntervalStartedAt` value.
3. **No Job Store Access:** Combined with `noLock`, no operations are made on the job store.

Use Case:

- **Reaggregation:** Let's say you discover a bug in your daily report aggregation pipeline from yesterday. Using this feature, you can rerun the aggregation for a specified past period (or even a future period) without interfering with ongoing aggregations.

This feature lacks built-in safeguards against running multiple jobs for the same interval. Exercise caution and ensure no overlap when deploying tasks using this option.

## Enable debug logging

Job status changes are logged via the [debug](https://github.com/visionmedia/debug) module under the `cronyx` namespace.

```sh
env DEBUG="cronyx" node script.js
# or
# env DEBUG="cronyx" bun script.js
```
