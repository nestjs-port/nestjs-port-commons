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

export interface Query {
  sql: string;
  params: unknown[];
}

export interface SqlTemplate {
  strings: TemplateStringsArray;
  expressions: unknown[];
}

export interface SQLWrapper {
  getSQL(): SQL;
  shouldOmitSQLParens?(): boolean;
}

export type SqlFragment = SQL | SQLWrapper;

export function isSQLWrapper(value: unknown): value is SQLWrapper {
  return (
    value !== null &&
    value !== undefined &&
    typeof (value as SQLWrapper).getSQL === "function"
  );
}

export class StringChunk implements SQLWrapper {
  constructor(readonly value: string | readonly string[]) {}

  getSQL(): SQL {
    return new SQL([this]);
  }

  shouldOmitSQLParens(): boolean {
    return true;
  }
}

export class Name implements SQLWrapper {
  constructor(readonly value: string) {}

  getSQL(): SQL {
    return new SQL([this]);
  }
}

export class Param<TData = unknown> implements SQLWrapper {
  constructor(readonly value: TData) {}

  getSQL(): SQL {
    return new SQL([this]);
  }
}

export class Placeholder<
  TName extends string = string,
  TValue = unknown,
> implements SQLWrapper {
  declare protected: TValue;

  constructor(readonly name: TName) {}

  getSQL(): SQL {
    return new SQL([this]);
  }
}

export type SQLChunk =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | object
  | null
  | undefined
  | StringChunk
  | Name
  | Param
  | Placeholder
  | SQL
  | SQLWrapper
  | readonly SQLChunk[];

export class SQL<T = unknown> implements SQLWrapper {
  declare _: {
    brand: "SQL";
    type: T;
  };

  constructor(readonly queryChunks: unknown[]) {}

  append(query: SQL): this {
    this.queryChunks.push(...query.queryChunks);
    return this;
  }

  getSQL(): SQL {
    return this;
  }

  toQuery(): Query {
    return buildQueryFromSourceParams(this.queryChunks);
  }

  as(alias: string): SQL {
    return new SQL([this, new StringChunk(` as ${escapeIdentifier(alias)}`)]);
  }
}

function buildQueryFromSourceParams(chunks: readonly unknown[]): Query {
  const queryParts: string[] = [];
  const params: unknown[] = [];

  for (const chunk of chunks) {
    appendChunk(queryParts, params, chunk);
  }

  return {
    sql: queryParts.join(""),
    params,
  };
}

function appendChunk(
  queryParts: string[],
  params: unknown[],
  chunk: unknown,
): void {
  if (chunk === undefined) {
    return;
  }

  if (Array.isArray(chunk)) {
    queryParts.push("(");
    chunk.forEach((item, index) => {
      if (index > 0) {
        queryParts.push(", ");
      }
      appendChunk(queryParts, params, item);
    });
    queryParts.push(")");
    return;
  }

  if (chunk instanceof SQL) {
    for (const nestedChunk of chunk.queryChunks) {
      appendChunk(queryParts, params, nestedChunk);
    }
    return;
  }

  if (chunk instanceof StringChunk) {
    queryParts.push(stringifyChunkValue(chunk.value));
    return;
  }

  if (chunk instanceof Name) {
    queryParts.push(escapeIdentifier(chunk.value));
    return;
  }

  if (chunk instanceof Param) {
    queryParts.push("?");
    params.push(chunk.value);
    return;
  }

  if (chunk instanceof Placeholder) {
    queryParts.push("?");
    params.push(chunk);
    return;
  }

  if (isSQLWrapper(chunk)) {
    const sql = chunk.getSQL();
    if (chunk.shouldOmitSQLParens?.()) {
      appendChunk(queryParts, params, sql);
      return;
    }
    queryParts.push("(");
    appendChunk(queryParts, params, sql);
    queryParts.push(")");
    return;
  }

  queryParts.push("?");
  params.push(chunk);
}

function escapeIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function stringifyChunkValue(value: string | readonly string[]): string {
  if (Array.isArray(value)) {
    return value.join("");
  }

  return value as string;
}

function normalizeJoinedChunk(chunk: unknown): unknown {
  return typeof chunk === "string" ? new StringChunk(chunk) : chunk;
}

export function sql(
  strings: TemplateStringsArray,
  ...expressions: readonly unknown[]
): SQL {
  const queryChunks: unknown[] = [];
  if (strings.length > 0 && strings[0] !== "") {
    queryChunks.push(new StringChunk(strings[0]!));
  } else if (strings.length === 0) {
    queryChunks.push(new StringChunk(""));
  }

  for (const [index, expression] of expressions.entries()) {
    queryChunks.push(normalizeExpression(expression));
    queryChunks.push(new StringChunk(strings[index + 1] ?? ""));
  }

  return new SQL(queryChunks);
}

function normalizeExpression(expression: unknown): unknown {
  if (expression instanceof SQL) {
    return expression;
  }

  if (expression instanceof StringChunk) {
    return expression;
  }

  if (expression instanceof Name) {
    return expression;
  }

  if (expression instanceof Param) {
    return expression;
  }

  if (expression instanceof Placeholder) {
    return expression;
  }

  if (isSQLWrapper(expression)) {
    return expression.getSQL();
  }

  return expression;
}

export function toQuery(fragment: SqlFragment): Query {
  return fragment.getSQL().toQuery();
}

export function toSql(fragment: SqlFragment): string {
  return toQuery(fragment).sql;
}

export function toSqlTemplate(fragment: SqlFragment): SqlTemplate {
  return buildSqlTemplateFromSourceParams(fragment.getSQL().queryChunks);
}

function buildSqlTemplateFromSourceParams(
  chunks: readonly unknown[],
): SqlTemplate {
  const strings: string[] = [""];
  const expressions: unknown[] = [];

  for (const chunk of chunks) {
    appendTemplateChunk(strings, expressions, chunk);
  }

  return {
    strings: Object.assign(strings.slice(), {
      raw: strings.slice(),
    }) as unknown as TemplateStringsArray,
    expressions,
  };
}

function appendTemplateChunk(
  strings: string[],
  expressions: unknown[],
  chunk: unknown,
): void {
  if (chunk === undefined) {
    return;
  }

  if (Array.isArray(chunk)) {
    appendLiteral(strings, "(");
    chunk.forEach((item, index) => {
      if (index > 0) {
        appendLiteral(strings, ", ");
      }
      appendTemplateChunk(strings, expressions, item);
    });
    appendLiteral(strings, ")");
    return;
  }

  if (chunk instanceof SQL) {
    for (const nestedChunk of chunk.queryChunks) {
      appendTemplateChunk(strings, expressions, nestedChunk);
    }
    return;
  }

  if (chunk instanceof StringChunk) {
    appendLiteral(strings, stringifyChunkValue(chunk.value));
    return;
  }

  if (chunk instanceof Name) {
    appendLiteral(strings, escapeIdentifier(chunk.value));
    return;
  }

  if (isSQLWrapper(chunk)) {
    if (chunk.shouldOmitSQLParens?.()) {
      appendTemplateChunk(strings, expressions, chunk.getSQL());
      return;
    }

    appendLiteral(strings, "(");
    appendTemplateChunk(strings, expressions, chunk.getSQL());
    appendLiteral(strings, ")");
    return;
  }

  appendExpression(strings, expressions, chunk);
}

function appendLiteral(strings: string[], value: string): void {
  strings[strings.length - 1] += value;
}

function appendExpression(
  strings: string[],
  expressions: unknown[],
  value: unknown,
): void {
  expressions.push(value);
  strings.push("");
}

export namespace sql {
  export function empty(): SQL {
    return new SQL([]);
  }
  export function fromList(list: readonly unknown[]): SQL {
    return new SQL(list.map(normalizeJoinedChunk));
  }
  export function raw(str: string): SQL {
    return new SQL([new StringChunk(str)]);
  }
  export function identifier(value: string): Name {
    return new Name(value);
  }
  export function join(chunks: readonly unknown[], separator?: unknown): SQL {
    const queryChunks: unknown[] = [];
    for (const [index, chunk] of chunks.entries()) {
      if (index > 0 && separator !== undefined) {
        queryChunks.push(normalizeJoinedChunk(separator));
      }
      queryChunks.push(normalizeJoinedChunk(chunk));
    }
    return new SQL(queryChunks);
  }
  export function param<TData>(value: TData): Param<TData> {
    return new Param(value);
  }
  export function placeholder<TName extends string>(
    name: TName,
  ): Placeholder<TName> {
    return new Placeholder(name);
  }
}
