import type { Types } from "mongoose";
import type { Source } from "..";

/**
 * @public
 */
export type JobLockId<S extends Source> = S extends Source.Mongodb
  ? Types.ObjectId
  : S extends Source.Redis
  ? string
  : S extends Source.Mysql
  ? string
  : S extends Source.Postgres
  ? string
  : never;

/**
 * @public
 */
export default interface BaseJobLock<T> {
  _id: T | null;
  jobName: string;
  jobInterval: number;
  jobIntervalEndedAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
