import type { Repository } from "typeorm";
import { DataSource } from "typeorm";
import type { Source } from "../..";
import { TypeormJobLockEntity } from "../../job-lock/typeorm";
import type TypeormJobLock from "../../job-lock/typeorm";
import { hasErrorCode } from "../../util";
import type BaseJobStore from "../base";

/**
 * @public
 */
export default abstract class TypeormJobStore implements BaseJobStore<Source.Mysql | Source.Postgres> {
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
    const deactivatedJobLock = await this.#repository.preload({ _id: jobId, isActive: false, updatedAt: new Date() });
    if (!deactivatedJobLock) throw new Error(`Cannot find job lock for ${jobName}`);

    return await this.#repository.save(deactivatedJobLock);
  }

  async removeJobLock(jobName: string, jobId: string): Promise<void> {
    const result = await this.#repository.delete({ _id: jobId });
    if (result.affected === 0) throw new Error(`Cannot find job lock for ${jobName}`);
  }
}
