#!/usr/bin/env bun
import Cronyx, { MongodbJobStore } from "../../src";

const jobStore = await MongodbJobStore.connect(Bun.env.MONGO_URI!);
const cronyx = new Cronyx({ jobStore });
await cronyx.requestJobExec(
  {
    jobName: "parent-job",
    jobInterval: "0 * * * *",
    requiredJobNames: ["child-job"],
  },
  async (job) => {
    console.log(job.intervalStartedAt);
    console.log(job.intervalEndedAt);
  },
);
await jobStore.close();
