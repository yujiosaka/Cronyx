import { isEqual } from "date-fns";
import { createClient, RedisClientOptions, WatchError } from "redis";
import type BaseJobStore from ".";
import { CronyxNotFoundError } from "../error";
import RedisJobLock from "../job-lock/redis";

const ACTIVE_JOB_LOCK_PREFIX = "joblocks:active:";
const JOB_LOCK_PREFIX = "joblocks:";

type RedisClientType = ReturnType<typeof createClient>;

/**
 * @public
 */
export default class RedisJobStore implements BaseJobStore<string> {
  #client: RedisClientType;

  /**
   * @internal
   */
  constructor(client: RedisClientType) {
    this.#client = client;
  }

  static async connect(options: RedisClientOptions): Promise<RedisJobStore> {
    const client = createClient(options);
    await client.connect();
    return new RedisJobStore(client);
  }

  async sync() {
    // Do nothing
  }

  async close() {
    await this.#client.quit();
  }

  async fetchLastJobLock(jobName: string): Promise<RedisJobLock | null> {
    const [activeJobLockJson, jobLockJson] = (await this.#client
      .multi()
      .get(`${ACTIVE_JOB_LOCK_PREFIX}${jobName}`)
      .get(`${JOB_LOCK_PREFIX}${jobName}`)
      .exec()) as [string, string];

    if (activeJobLockJson) {
      return RedisJobLock.parse(JSON.parse(activeJobLockJson));
    }
    if (jobLockJson) {
      return RedisJobLock.parse(JSON.parse(jobLockJson));
    }
    return null;
  }

  async activateJobLock(
    jobName: string,
    jobInterval: number,
    jobIntervalEndedAt: Date,
    retryIntervalStartedAt: Date,
  ): Promise<RedisJobLock | null> {
    try {
      return await this.#client.executeIsolated(async (isolatedClient) => {
        const now = new Date();
        const multi = isolatedClient.multi();

        await isolatedClient.watch([`${ACTIVE_JOB_LOCK_PREFIX}${jobName}`, `${JOB_LOCK_PREFIX}${jobName}`]);
        try {
          const lastJobLock = await this.fetchLastJobLock(jobName);
          if (lastJobLock) {
            if (lastJobLock.isActive) {
              if (lastJobLock.updatedAt <= retryIntervalStartedAt) {
                const reactivatedJobLock = { ...lastJobLock, jobInterval, updatedAt: now };
                multi.set(`${ACTIVE_JOB_LOCK_PREFIX}${jobName}`, JSON.stringify(reactivatedJobLock));

                return reactivatedJobLock;
              }
              return null;
            }

            if (isEqual(lastJobLock.jobIntervalEndedAt, jobIntervalEndedAt)) {
              return null;
            }
          }

          const activatedJobLock = RedisJobLock.parse({
            jobName,
            jobIntervalEndedAt,
            jobInterval,
          });
          multi.set(`${ACTIVE_JOB_LOCK_PREFIX}${jobName}`, JSON.stringify(activatedJobLock));

          return activatedJobLock;
        } finally {
          await multi.exec();
        }
      });
    } catch (error) {
      if (error instanceof WatchError) {
        return null;
      }
      throw error;
    }
  }

  async deactivateJobLock(jobName: string, jobId: string): Promise<RedisJobLock> {
    const activeJobLock = await this.#getActiveJobLock(jobName);
    if (!activeJobLock || activeJobLock._id !== jobId) {
      throw new CronyxNotFoundError(`Cannot find job lock for ${jobName}`);
    }

    const detivatedJobLock = { ...activeJobLock, isActive: false, updatedAt: new Date() };
    await this.#client
      .multi()
      .set(`${JOB_LOCK_PREFIX}${jobName}`, JSON.stringify(detivatedJobLock))
      .del(`${ACTIVE_JOB_LOCK_PREFIX}${jobName}`)
      .exec();

    return detivatedJobLock;
  }

  async removeJobLock(jobName: string, jobId: string): Promise<void> {
    const activeJobLock = await this.#getActiveJobLock(jobName);
    if (!activeJobLock || activeJobLock._id !== jobId) {
      throw new CronyxNotFoundError(`Cannot find job lock for ${jobName}`);
    }

    await this.#client.del(`${ACTIVE_JOB_LOCK_PREFIX}${jobName}`);
  }

  async #getActiveJobLock(jobName: string): Promise<RedisJobLock | null> {
    const activeJobLockJson = await this.#client.get(`${ACTIVE_JOB_LOCK_PREFIX}${jobName}`);
    if (!activeJobLockJson) return null;

    return RedisJobLock.parse(JSON.parse(activeJobLockJson));
  }
}
