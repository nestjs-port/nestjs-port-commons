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

import {
  toSqlTemplate,
  type Connection,
  type SqlFragment,
} from "../api/index.js";
import type { PrismaRawClient, PrismaRuntime } from "./prisma.js";

export class PrismaConnection implements Connection {
  #closed = false;

  constructor(
    private readonly prisma: PrismaRawClient,
    private readonly _prismaRuntime: PrismaRuntime,
  ) {}

  async query(fragment: SqlFragment): Promise<Record<string, unknown>[]> {
    this.assertOpen();
    const { strings, expressions } = toSqlTemplate(fragment);
    return this.prisma.$queryRaw<Record<string, unknown>[]>(
      this._prismaRuntime.sql(strings, ...expressions),
    );
  }

  async update(fragment: SqlFragment): Promise<number> {
    this.assertOpen();
    const { strings, expressions } = toSqlTemplate(fragment);
    return this.prisma.$executeRaw(
      this._prismaRuntime.sql(strings, ...expressions),
    );
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
