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
