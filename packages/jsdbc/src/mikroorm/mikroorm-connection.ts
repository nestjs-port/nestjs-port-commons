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

import type { MikroORM } from "@mikro-orm/core";
import { toQuery, type Connection, type SqlFragment } from "../api/index.js";

type MikroOrmEntityManager = MikroORM["em"] & {
  execute(
    query: string,
    params?: readonly unknown[],
    method?: "all" | "get" | "run",
  ): Promise<unknown>;
};

export class MikroOrmConnection implements Connection {
  #closed = false;

  constructor(private readonly executor: MikroOrmEntityManager) {}

  async query(fragment: SqlFragment): Promise<Record<string, unknown>[]> {
    this.assertOpen();
    const { sql: query, params: parameters } = toQuery(fragment);
    return this.executor.execute(query, parameters, "all") as Promise<
      Record<string, unknown>[]
    >;
  }

  async update(fragment: SqlFragment): Promise<number> {
    this.assertOpen();
    const { sql: query, params: parameters } = toQuery(fragment);
    const result = await this.executor.execute(query, parameters, "run");
    return extractAffectedRows(result);
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

function extractAffectedRows(result: unknown): number {
  if (result != null && typeof result === "object") {
    const candidate = result as {
      affectedRows?: unknown;
    };

    if (typeof candidate.affectedRows === "number") {
      return candidate.affectedRows;
    }
  }

  return 0;
}
