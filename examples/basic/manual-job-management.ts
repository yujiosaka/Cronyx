#!/usr/bin/env bun
import Cronyx from "../../src";
import { MongodbJobStore } from "../../src/job-store";

const jobStore = await MongodbJobStore.connect(Bun.env.MONGO_URI!);
const cronyx = new Cronyx({ jobStore });
const job = await cronyx.requestJobStart({
  jobName: "manual-job",
  jobInterval: { hours: 1 },
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
await jobStore.close();
