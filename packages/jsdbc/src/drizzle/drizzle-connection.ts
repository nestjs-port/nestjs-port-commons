/*
 * Copyright 2026-present the original author or authors.
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

import { sql as drizzleSql, type SQL as DrizzleSQL } from "drizzle-orm";

import {
  isSQLWrapper,
  Name,
  Param,
  Placeholder,
  SQL,
  StringChunk,
  type Connection,
  type SqlFragment,
} from "../api/index.js";
import type { DrizzleDatabase } from "./drizzle.js";

export class DrizzleConnection implements Connection {
  #closed = false;

  constructor(private readonly db: DrizzleDatabase) {}

  async query(fragment: SqlFragment): Promise<Record<string, unknown>[]> {
    this.assertOpen();
    const result = await this.db.execute(toDrizzleSql(fragment));
    return extractRows(result);
  }

  async update(fragment: SqlFragment): Promise<number> {
    this.assertOpen();
    const result = await this.db.execute(toDrizzleSql(fragment));
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

function toDrizzleSql(fragment: SqlFragment): DrizzleSQL {
  if (fragment instanceof SQL) {
    return drizzleSql.join(fragment.queryChunks.map(toDrizzleSqlChunk));
  }

  if (fragment instanceof StringChunk) {
    return drizzleSql.raw(stringifyStringChunk(fragment.value));
  }

  if (fragment instanceof Name) {
    return drizzleSql.join([drizzleSql.identifier(fragment.value)]);
  }

  if (fragment instanceof Param) {
    return drizzleSql.join([drizzleSql.param(fragment.value)]);
  }

  if (fragment instanceof Placeholder) {
    return drizzleSql.join([drizzleSql.placeholder(fragment.name)]);
  }

  if (isSQLWrapper(fragment)) {
    const nested = toDrizzleSql(fragment.getSQL());
    if (fragment.shouldOmitSQLParens?.()) {
      return nested;
    }
    return drizzleSql.join([drizzleSql.raw("("), nested, drizzleSql.raw(")")]);
  }

  return toDrizzleSqlChunk(fragment);
}

function toDrizzleSqlChunk(chunk: unknown): DrizzleSQL {
  if (chunk instanceof SQL || isSQLWrapper(chunk)) {
    return toDrizzleSql(chunk as SqlFragment);
  }

  if (Array.isArray(chunk)) {
    return drizzleSql.join(
      chunk.map((item) => toDrizzleSqlChunk(item)),
      drizzleSql.raw(", "),
    );
  }

  if (chunk instanceof StringChunk) {
    return drizzleSql.raw(stringifyStringChunk(chunk.value));
  }

  if (chunk instanceof Name) {
    return drizzleSql.join([drizzleSql.identifier(chunk.value)]);
  }

  if (chunk instanceof Param) {
    return drizzleSql.join([drizzleSql.param(chunk.value)]);
  }

  if (chunk instanceof Placeholder) {
    return drizzleSql.join([drizzleSql.placeholder(chunk.name)]);
  }

  if (typeof chunk === "string") {
    return drizzleSql.join([drizzleSql.param(chunk)]);
  }

  return drizzleSql.join([drizzleSql.param(chunk)]);
}

function stringifyStringChunk(value: string | readonly string[]): string {
  if (Array.isArray(value)) {
    return value.join("");
  }

  return value as string;
}

export function extractRows(result: unknown): Record<string, unknown>[] {
  if (result == null) {
    return [];
  }

  if (
    !Array.isArray(result) &&
    typeof result === "object" &&
    "rows" in result
  ) {
    const rows = (result as Record<string, unknown>).rows;
    if (Array.isArray(rows)) {
      return rows as Record<string, unknown>[];
    }
  }

  if (Array.isArray(result)) {
    if (result.length >= 1 && Array.isArray(result[0])) {
      return result[0] as Record<string, unknown>[];
    }
    return result as Record<string, unknown>[];
  }

  return [];
}

export function extractAffectedRows(result: unknown): number {
  if (result == null) {
    return 0;
  }

  const targets: unknown[] = [result];
  if (Array.isArray(result) && result.length >= 1) {
    targets.push(result[0]);
  }

  for (const target of targets) {
    if (target != null && typeof target === "object") {
      const obj = target as Record<string, unknown>;
      if (typeof obj.rowCount === "number") return obj.rowCount;
      if (typeof obj.count === "number") return obj.count;
      if (typeof obj.affectedRows === "number") return obj.affectedRows;
      if (typeof obj.changes === "number") return obj.changes;
      if (typeof obj.rowsAffected === "number") return obj.rowsAffected;
    }
  }

  return 0;
}
