#!/usr/bin/env bun
import Cronyx from "../../src";
import { RedisJobStore } from "../../src/job-store";

const jobStore = await RedisJobStore.connect({ url: Bun.env.REDIS_URI });
const cronyx = new Cronyx({ jobStore });
await cronyx.requestJobExec(
  {
    jobName: "hourly-job",
    jobInterval: "0 * * * *",
  },
  async (job) => {
    console.log(job.intervalStartedAt);
    console.log(job.intervalEndedAt);
  },
);
await jobStore.close();
