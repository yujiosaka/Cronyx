/**
 * @public
 */
export default interface BaseJobLock<I> {
  _id: I | null;
  jobName: string;
  jobInterval: number;
  jobIntervalEndedAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
