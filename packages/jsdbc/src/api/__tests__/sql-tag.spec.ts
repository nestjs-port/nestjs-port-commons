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

import { describe, expect, it } from "vitest";

import {
  Name,
  Param,
  SQL,
  StringChunk,
  sql,
  toQuery,
  toSql,
} from "../sql-tag.js";

describe("sql", () => {
  it("builds an SQL instance with positional placeholders", () => {
    const fragment = sql`SELECT * FROM users WHERE id = ${1} AND name = ${"a"}`;

    expect(fragment).toBeInstanceOf(SQL);
    expect(toSql(fragment)).toBe(
      "SELECT * FROM users WHERE id = ? AND name = ?",
    );
    expect(toQuery(fragment).params).toEqual([1, "a"]);
  });

  it("keeps raw string chunks in the SQL AST", () => {
    const fragment = sql`a ${1} b ${2} c`;

    expect(fragment.queryChunks).toEqual([
      new StringChunk("a "),
      1,
      new StringChunk(" b "),
      2,
      new StringChunk(" c"),
    ]);
  });
});

describe("sql.join", () => {
  it("concatenates fragments without a separator", () => {
    const fragment = sql.join([sql`a = ${1}`, sql` b = ${2}`]);
    expect(toSql(fragment)).toBe("a = ? b = ?");
    expect(toQuery(fragment).params).toEqual([1, 2]);
  });

  it("interleaves a separator fragment between fragments", () => {
    const fragment = sql.join(
      [sql`a = ${1}`, sql`b = ${2}`, sql`c = ${3}`],
      sql` AND `,
    );
    expect(toSql(fragment)).toBe("a = ? AND b = ? AND c = ?");
    expect(toQuery(fragment).params).toEqual([1, 2, 3]);
  });

  it("returns an empty SQL instance for no inputs", () => {
    const fragment = sql.join([]);
    expect(fragment).toBeInstanceOf(SQL);
    expect(toSql(fragment)).toBe("");
    expect(toQuery(fragment).params).toEqual([]);
  });

  it("joins a single fragment without a separator", () => {
    const fragment = sql.join([sql`a = ${1}`], sql` AND `);
    expect(toSql(fragment)).toBe("a = ?");
    expect(toQuery(fragment).params).toEqual([1]);
  });

  it("composes into an outer sql template via the joined result", () => {
    const filters = sql.join(
      [sql`status = ${"active"}`, sql`org = ${"o"}`],
      sql` AND `,
    );
    const where = sql.join([sql`SELECT * FROM t WHERE `, filters]);

    expect(toSql(where)).toBe("SELECT * FROM t WHERE status = ? AND org = ?");
    expect(toQuery(where).params).toEqual(["active", "o"]);
  });
});

describe("sql helpers", () => {
  it("creates an empty SQL fragment", () => {
    const fragment = sql.empty();
    expect(fragment).toBeInstanceOf(SQL);
    expect(toSql(fragment)).toBe("");
    expect(toQuery(fragment).params).toEqual([]);
  });

  it("creates raw SQL fragments", () => {
    const fragment = sql.raw("count(*)");
    expect(toSql(fragment)).toBe("count(*)");
    expect(fragment.queryChunks).toEqual([new StringChunk("count(*)")]);
  });

  it("creates quoted identifiers", () => {
    const fragment = sql.identifier(`user"name`);
    expect(fragment).toBeInstanceOf(Name);
    expect(toSql(fragment)).toBe(`"user""name"`);
    expect(toQuery(fragment).params).toEqual([]);
  });

  it("creates explicit parameter fragments", () => {
    const fragment = sql.param(42);
    expect(fragment).toBeInstanceOf(Param);
    expect(toSql(fragment)).toBe("?");
    expect(toQuery(fragment).params).toEqual([42]);
  });
});
