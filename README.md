# Cronyx [![npm version](https://badge.fury.io/js/cronyx.svg)](https://badge.fury.io/js/cronyx) [![CI/CD](https://github.com/yujiosaka/Cronyx/actions/workflows/ci_cd.yml/badge.svg)](https://github.com/yujiosaka/Cronyx/actions/workflows/ci_cd.yml)

###### [Examples](https://github.com/yujiosaka/Cronyx/blob/main/examples) | [API](https://github.com/yujiosaka/Cronyx/blob/main/docs/API.md) | [Tips](https://github.com/yujiosaka/Cronyx/blob/main/docs/TIPS.md) | [Code of Conduct](https://github.com/yujiosaka/Cronyx/blob/main/docs/CODE_OF_CONDUCT.md) | [Contributing](https://github.com/yujiosaka/Cronyx/blob/main/docs/CONTRIBUTING.md) | [Changelog](https://github.com/yujiosaka/Cronyx/blob/main/docs/CHANGELOG.md)

Script-based task scheduler with scalable architecture, and integrated dependency management.

## 🌟 Features

<img src="https://github.com/yujiosaka/Cronyx/assets/2261067/09977f48-6bfb-48a6-93ad-3325fccc901a" alt="icon" width="300" align="right">

Cronyx isn't just another job scheduler or task manager. It's a bridge that connects the simplicity of cronjobs and the power of modern job schedulers.

### Why Cronyx?

🔗 **Preserve Existing Cronjobs**: No need to change scripts running in cronjobs or alive processes. Cronyx helps you scale the existing cronjobs with minimal effort.

🕒 **Script-based Scheduling**: Unlike many job schedulers that require persistent processes, Cronyx jobs can be triggered by scripts, eliminating the need for always-on processes.

🔄 **Self-Recovery**: Cronyx automatically recovers from any delay, ensuring that no data is lost during the process.

💡 **Efficient Scaling**: Schedule the same job and start them at the exact same time across multiple servers. Cronyx uses atomic operations, transactions, and other techniques to ensure that only one instance of a job runs at any given time.

🔒 **Multiple Persistence Options**: Choose from [MongoDB](https://www.mongodb.com/), [Redis](https://redis.io/), [MySQL](https://www.mysql.com/), [PostgreSQL](https://www.postgresql.org/) and more for persisting job locks. Easily implement your custom data storage or file system.

🔗 **Job Dependencies**: Cronyx elegantly handles job dependencies, ensuring that dependent jobs only run after their prerequisites have completed.

⚙️ **Bun Compatibility**: While primarily targeting Node users, Cronyx is developed and rigorously tested using [Bun](https://bun.sh/).

### Comparisons with Existing Solutions

While libraries like [agenda](https://github.com/agenda/agenda) and [node-cron](https://github.com/node-cron/node-cron) are powerful, they come with the overhead of maintaining persistent processes. Cronyx brings the best of both worlds, allowing for script-based task scheduling while also offering powerful features that rival its counterparts.

## 🚀 Getting Started

To harness the power of Cronyx, let's get started!

### Installation

Install the Cronyx package using npm:

```sh
$ npm install cronyx
# or
# $ bun add cronyx
```

### Basic Usage

#### 1. Manually Handling Job Execution:

Here's how you can schedule an hourly task with Cronyx and manage the job's lifecycle manually:

```ts
// MysqlJobStore, PostgresJobStore and RedisJobStore are also available out of the box
import Cronyx, { MongodbJobStore } from "cronyx";

const jobStore = await MongodbJobStore.connect("mongodb://mongo:27017/db");
const cronyx = new Cronyx({ jobStore });
// Request the start of the job
const job = await cronyx.requestJobStart({
  // Name of the job for identification
  jobName: "hourly-job",
  // Interval in string for cron expression, number for milliseconds or date-fns Duration object
  jobInterval: "0 * * * *",
});

// Check if the job is due to run
if (job) {
  try {
    // Log the actual start time of the interval (may not align with real execution time)
    console.log(job.intervalStartedAt);
    // Log the end time of the interval (job.intervalStartedAt + 1 hour for this hourly job)
    console.log(job.intervalEndedAt);
    // Notify Cronyx of job completion after successful execution
    await job.finish();
  } catch {
    // Notify Cronyx of job interruption in case of errors or exceptions
    await job.interrupt();
  }
}
```

In this method, you have complete control over the job execution. If the job returns `null` (i.e., it's not time to run it yet), the process will simply exit. If the job is due to run, you can execute your task and then explicitly close or interrupt the job based on your requirements.

#### 2. Using the Shorthand Callback:

For a more concise approach, Cronyx allows you to pass a callback which will be automatically executed if the job needs to run:

```ts
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
```

With this method, Cronyx takes care of the job's lifecycle for you. If the callback task is successful, `job.finish()` is automatically called. If an error occurs, `job.interrupt()` is invoked.

### Behind The Scenes

Cronyx acts as a job guard. For example, if you've set a job to run every hour and executed it last at 3:00 pm, you can terminate the process right after its completion. Running the script again before 4:00 pm won't initiate the job, ensuring that your tasks are executed only as often as required.

This approach makes Cronyx suitable for scenarios where tasks are not required to run frequently, helping to save costs and reduce unnecessary overhead.

### Configuring Crontab

For better reliability, schedule your cronjob (the one that triggers the script) to run more frequently than your task's interval. This accounts for potential failures and ensures smoother operations.

For instance, if your Cronyx job is set to run every hour, configure your crontab to run every 10 minutes.

```sh
*/10 * * * * /path/to/your/script
```

### Handling Job Dependencies

To handle job dependencies, simply use the requiredJobs option:

```ts
const cronyx = new Cronyx({ jobStore });
await cronyx.requestJobExec(
  {
    jobName: "daily-job",
    jobInterval: "0 0 * * *",
    // Specify job dependencies using their names
    requiredJobs: "hourly-job",
  },
  async (job) => {
    console.log(job.intervalStartedAt);
    console.log(job.intervalEndedAt);
  },
);
```

## 📃 Examples

See [here](https://github.com/yujiosaka/Cronyx/blob/main/examples) for the full examples list. The examples can be run from the root directory as follows:

- [Basic usage](https://github.com/yujiosaka/Cronyx/blob/main/examples/basic)
- [Various job stores usage](https://github.com/yujiosaka/Cronyx/blob/main/examples/job-stores)
- [Job dependency management](https://github.com/yujiosaka/Cronyx/blob/main/examples/job-dependency)

```sh
docker compose run test ./examples/basic/manual-job-management.ts
```

## 💻 Development

Using Visual Studio Code and the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension, you can simplify the development environment setup process. The extension allows you to develop inside a Docker container and automatically sets up the development environment for you.

1. Install the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension in Visual Studio Code.

2. Clone the repository:

```sh
git clone https://github.com/yujiosaka/Cronyx.git
```

3. Open the cloned repository in Visual Studio Code.

4. When prompted by Visual Studio Code, click "Reopen in Container" to open the project inside the Docker container.

5. The extension will build the Docker container and set up the development environment for you. This may take a few minutes.

6. Build and run the Docker container with Docker Compose:

```sh
$ docker-compose up --build
```

This will start testing in watch mode.

## 🧑‍💻️ API reference

See [here](https://github.com/yujiosaka/Cronyx/blob/main/docs/API.md) for the API reference.

## 🐞 Debugging tips

See [here](https://github.com/yujiosaka/Cronyx/blob/main/docs/TIPS.md) for the debugging tips.

## 💳 License

This project is licensed under the MIT License. See [LICENSE](https://github.com/yujiosaka/Cronyx/blob/main/LICENSE) for details.

## 🙏 Thanks

The [idea of using MongoDB's atomic operation to elegantly ensuring job lock](https://github.com/yujiosaka/Cronyx/blob/main/src/job-store/mongodb.ts) is borrowed by [@crumbjp](https://github.com/crumbjp).
