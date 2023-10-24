#!/usr/bin/env bun
import Cronyx, { PostgresJobStore } from "../../src";

const jobStore = await PostgresJobStore.connect({ type: "postgres", url: Bun.env.POSTGRES_URI });
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
