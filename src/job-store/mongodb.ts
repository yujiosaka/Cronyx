import { MongoError } from "mongodb";
import type { Connection, ConnectOptions, Model, Types } from "mongoose";
import { createConnection } from "mongoose";
import type BaseJobStore from ".";
import { CronyxNotFoundError } from "../error";
import type MongodbJobLock from "../job-lock/mongodb";
import { mongodbJobLockSchema } from "../job-lock/mongodb";

/**
 * @public
 */
export default class MongodbJobStore implements BaseJobStore<Types.ObjectId> {
  #conn: Connection;
  #model: Model<MongodbJobLock>;

  /**
   * @internal
   */
  constructor(conn: Connection) {
    this.#conn = conn;
    this.#model = conn.model<MongodbJobLock>("JobLock", mongodbJobLockSchema);
  }

  static async connect(url: string, options?: ConnectOptions): Promise<MongodbJobStore> {
    const conn = createConnection(url, options);
    await conn.asPromise();
    return new MongodbJobStore(conn);
  }

  async sync() {
    await this.#conn.syncIndexes();
  }

  async close() {
    await this.#conn.close();
  }

  async fetchLastJobLock(jobName: string): Promise<MongodbJobLock | null> {
    return await this.#model.where({ jobName }).sort({ jobIntervalEndedAt: -1 }).findOne();
  }

  async activateJobLock(
    jobName: string,
    jobInterval: number,
    jobIntervalEndedAt: Date,
    retryIntervalStartedAt: Date,
  ): Promise<MongodbJobLock | null> {
    try {
      return await this.#model.findOneAndUpdate(
        { jobName, jobIntervalEndedAt, isActive: true, updatedAt: { $lte: retryIntervalStartedAt } },
        { jobInterval, updatedAt: new Date() },
        { setDefaultsOnInsert: true, new: true, upsert: true },
      );
    } catch (error) {
      if (error instanceof MongoError && error.code === 11000) {
        return null;
      }
      throw error;
    }
  }

  async deactivateJobLock(jobName: string, jobId: Types.ObjectId): Promise<MongodbJobLock> {
    const deactivatedJobLock = await this.#model.findOneAndUpdate(
      { _id: jobId, jobName, isActive: true },
      { isActive: false, updatedAt: new Date() },
      { new: true },
    );
    if (!deactivatedJobLock) throw new CronyxNotFoundError(`Cannot find job lock for ${jobName}`);

    return deactivatedJobLock;
  }

  async removeJobLock(jobName: string, jobId: Types.ObjectId): Promise<void> {
    const result = await this.#model.deleteOne({ _id: jobId, jobName, isActive: true });
    if (result.deletedCount === 0) throw new CronyxNotFoundError(`Cannot find job lock for ${jobName}`);
  }
}
