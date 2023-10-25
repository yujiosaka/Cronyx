import type { Repository } from "typeorm";
import { DataSource } from "typeorm";
import type BaseJobStore from "..";
import { CronyxNotFoundError } from "../../error";
import { TypeormJobLockEntity } from "../../job-lock/typeorm";
import type TypeormJobLock from "../../job-lock/typeorm";
import { hasErrorCode } from "../../util";

/**
 * @public
 */
export default abstract class TypeormJobStore implements BaseJobStore<string> {
  protected abstract uniqueConstraintErrorCode: string;
  #dataSource: DataSource;
  #repository: Repository<TypeormJobLockEntity>;

  /**
   * @internal
   */
  constructor(dataSource: DataSource) {
    this.#dataSource = dataSource;
    this.#repository = dataSource.getRepository<TypeormJobLock>(TypeormJobLockEntity);
  }

  async close() {
    await this.#dataSource.destroy();
  }

  async fetchLastJobLock(jobName: string): Promise<TypeormJobLock | null> {
    return await this.#repository.findOne({
      where: { jobName },
      order: { jobIntervalEndedAt: -1 },
    });
  }

  async activateJobLock(
    jobName: string,
    jobInterval: number,
    jobIntervalEndedAt: Date,
    retryIntervalStartedAt: Date,
  ): Promise<TypeormJobLock | null> {
    return await this.#repository.manager.transaction(async (transactionalEntityManager) => {
      const now = new Date();

      const activeJobLock = await transactionalEntityManager.findOne(TypeormJobLockEntity, {
        where: { jobName, jobIntervalEndedAt, isActive: true },
      });
      if (activeJobLock) {
        if (activeJobLock.updatedAt <= retryIntervalStartedAt) {
          activeJobLock.jobInterval = jobInterval;
          activeJobLock.updatedAt = now;
          return await transactionalEntityManager.save(activeJobLock);
        }
        return null;
      }

      const activatedJobLock = transactionalEntityManager.create(TypeormJobLockEntity, {
        jobName,
        jobInterval,
        jobIntervalEndedAt,
        // NOTE
        // manually set createdAt and updatedAt to prevent integration tests
        // to fail due to default timestamp set on database instead of application
        createdAt: now,
        updatedAt: now,
      });
      try {
        return await transactionalEntityManager.save(activatedJobLock);
      } catch (error) {
        if (hasErrorCode(error) && error.code === this.uniqueConstraintErrorCode) return null;
        throw error;
      }
    });
  }

  async deactivateJobLock(jobName: string, jobId: string): Promise<TypeormJobLock> {
    const deactivatedJobLock = await this.#repository.findOne({ where: { _id: jobId, jobName, isActive: true } });
    if (!deactivatedJobLock) throw new CronyxNotFoundError(`Cannot find job lock for ${jobName}`);

    return await this.#repository.save({ ...deactivatedJobLock, isActive: false, updatedAt: new Date() });
  }

  async removeJobLock(jobName: string, jobId: string): Promise<void> {
    const result = await this.#repository.delete({ _id: jobId, jobName, isActive: true });
    if (result.affected === 0) throw new CronyxNotFoundError(`Cannot find job lock for ${jobName}`);
  }
}
