import { DataSource } from "typeorm";
import type { AuroraMysqlConnectionOptions } from "typeorm/driver/aurora-mysql/AuroraMysqlConnectionOptions.js";
import type { MysqlConnectionOptions } from "typeorm/driver/mysql/MysqlConnectionOptions.js";
import { CronyxArgumentError } from "../../error";
import { TypeormJobLockEntity } from "../../job-lock/typeorm";
import TypeormJobStore from "./";

/**
 * @public
 */
export default class MysqlJobStore extends TypeormJobStore {
  protected uniqueConstraintErrorCode: string = "ER_DUP_ENTRY";

  static async connect(options: MysqlConnectionOptions | AuroraMysqlConnectionOptions): Promise<TypeormJobStore> {
    if (options.entities) throw new CronyxArgumentError("Option entities should not be passed");

    const dataSource = new DataSource({ ...options, entities: [TypeormJobLockEntity], synchronize: true });
    await dataSource.initialize();
    return new MysqlJobStore(dataSource);
  }
}
