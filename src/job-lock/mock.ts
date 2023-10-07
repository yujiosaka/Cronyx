import { z } from "zod";
import type { Optional } from "../util";
import type BaseJobLock from "./base";

type MockJobLockCreationAttributes = Optional<
  BaseJobLock<null>,
  "_id" | "jobInterval" | "isActive" | "createdAt" | "updatedAt"
>;

/**
 * @internal
 */
const MockJobLock = z.object({
  _id: z.null().optional().default(null),
  jobName: z.string(),
  jobInterval: z.number().default(0),
  jobIntervalEndedAt: z.coerce.date(),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date().default(() => new Date()),
  updatedAt: z.coerce.date().default(() => new Date()),
}) satisfies z.ZodType<MockJobLockCreationAttributes>;

/**
 * @internal
 */
type MockJobLock = Required<z.infer<typeof MockJobLock>>;

export default MockJobLock;
