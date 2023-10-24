import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import type BaseJobLock from ".";

/**
 * @public
 */
export default interface TypeormJobLock extends BaseJobLock<string> {
  _id: string;
}

/**
 * @internal
 */
@Entity("joblocks")
@Index(["jobName", "jobIntervalEndedAt"], { unique: true })
export class TypeormJobLockEntity implements TypeormJobLock {
  @PrimaryGeneratedColumn("uuid", { name: "id" })
  _id: string;

  @Column({ nullable: false })
  jobName: string;

  @Column({ nullable: false, default: 0 })
  jobInterval: number;

  @Column({ nullable: false, precision: 6 })
  jobIntervalEndedAt: Date;

  @Column({ nullable: false, default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
