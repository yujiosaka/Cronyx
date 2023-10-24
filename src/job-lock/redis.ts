import { v4 } from "uuid";
import { z } from "zod";
import type BaseJobLock from ".";
import type { Optional } from "../util";

type RedisJobLockCreationAttributes = Optional<
  BaseJobLock<string>,
  "_id" | "jobInterval" | "isActive" | "createdAt" | "updatedAt"
>;

/**
 * @public
 */
const RedisJobLock = z.object({
  _id: z
    .string()
    .uuid()
    .default(() => v4()),
  jobName: z.string(),
  jobInterval: z.number().default(0),
  jobIntervalEndedAt: z.coerce.date(),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date().default(() => new Date()),
  updatedAt: z.coerce.date().default(() => new Date()),
}) satisfies z.ZodType<RedisJobLockCreationAttributes>;

/**
 * @public
 */
type RedisJobLock = Required<z.infer<typeof RedisJobLock>>;

export default RedisJobLock;
