import { DataSource } from "typeorm";
import type { AuroraPostgresConnectionOptions } from "typeorm/driver/aurora-postgres/AuroraPostgresConnectionOptions.js";
import type { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions.js";
import { CronyxError } from "../../error";
import { TypeormJobLockEntity } from "../../job-lock/typeorm";
import TypeormJobStore from "./";

/**
 * @public
 */
export default class PostgresJobStore extends TypeormJobStore {
  protected uniqueConstraintErrorCode: string = "23505";

  static async connect(options: PostgresConnectionOptions | AuroraPostgresConnectionOptions): Promise<TypeormJobStore> {
    if (!options.synchronize === false) throw new CronyxError("Option synchronize should be enabled");
    if (options.entities) throw new CronyxError("Option entities should not be passed");

    const dataSource = new DataSource({ ...options, entities: [TypeormJobLockEntity], synchronize: true });
    await dataSource.initialize();
    return new PostgresJobStore(dataSource);
  }
}
