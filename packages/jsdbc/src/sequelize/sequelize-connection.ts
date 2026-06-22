/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { Sequelize } from "sequelize";
import { QueryTypes, type Transaction } from "sequelize";
import { toQuery, type Connection, type SqlFragment } from "../api/index.js";

export class SequelizeConnection implements Connection {
  #closed = false;

  constructor(
    private readonly sequelize: Sequelize,
    private readonly transaction?: Transaction,
  ) {}

  async query(fragment: SqlFragment): Promise<Record<string, unknown>[]> {
    this.assertOpen();
    const { sql: query, params: parameters } = toQuery(fragment);
    return await this.sequelize.query(query, {
      replacements: parameters,
      raw: true,
      transaction: this.transaction,
      type: QueryTypes.SELECT,
    });
  }

  async update(fragment: SqlFragment): Promise<number> {
    this.assertOpen();
    const { sql: query, params: parameters } = toQuery(fragment);
    const result = await this.sequelize.query(query, {
      replacements: parameters,
      transaction: this.transaction,
      type: QueryTypes.UPDATE,
    });
    return Array.isArray(result) ? result[1] : 0;
  }

  async close(): Promise<void> {
    this.#closed = true;
  }

  private assertOpen(): void {
    if (this.#closed) {
      throw new Error("Connection is already closed.");
    }
  }
}
