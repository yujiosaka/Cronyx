#!/usr/bin/env bun
import Cronyx, { MongodbJobStore } from "../../src";

const jobStore = await MongodbJobStore.connect(Bun.env.MONGO_URI!);
const cronyx = new Cronyx({ jobStore });
await cronyx.requestJobExec(
  {
    jobName: "automatic-job",
    jobInterval: { hours: 1 },
  },
  async (job) => {
    console.log(job.intervalStartedAt);
    console.log(job.intervalEndedAt);
  },
);
await jobStore.close();
