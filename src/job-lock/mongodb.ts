import { Schema } from "mongoose";
import type { Types } from "mongoose";
import type BaseJobLock from ".";

/**
 * @public
 */
export default interface MongodbJobLock extends BaseJobLock<Types.ObjectId> {
  _id: Types.ObjectId;
}

/**
 * @internal
 */
export const mongodbJobLockSchema = new Schema<MongodbJobLock>({
  jobName: { type: String, required: true },
  jobInterval: { type: Number, required: true, default: 0 },
  jobIntervalEndedAt: { type: Date, required: true },
  isActive: { type: Boolean, required: true, default: true },
  createdAt: { type: Date, required: true, default: Date.now },
  updatedAt: { type: Date, required: true, default: Date.now },
}).index({ jobName: 1, jobIntervalEndedAt: 1 }, { unique: true });
