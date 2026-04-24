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

import { Expose, Transform } from "class-transformer";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  type Connection,
  DatabaseDialect,
  type DataSource,
  type SqlFragment,
  sql,
} from "../../api/index.js";
import { ClassTransformerRowMapper } from "../class-transformer-row-mapper.js";
import { JsdbcTemplate } from "../jsdbc-template.js";
import type { RowMapper, RowMapperFunction } from "../row-mapper.interface.js";
import { SingleColumnRowMapper } from "../single-column-row-mapper.js";
import { StandardSchemaRowMapper } from "../standard-schema-row-mapper.js";
import { TransactionSynchronizationManager } from "../transaction-synchronization-manager.js";

type ConversationRowShape = {
  conversationId: number;
  displayName: string;
};

class ConversationRow {
  @Expose({ name: "conversation_id" })
  @Transform(({ value }) => Number(value))
  conversationId!: number;

  @Expose({ name: "display_name" })
  displayName!: string;
}

describe("JsdbcTemplate", () => {
  describe("dataSource", () => {
    it("returns the underlying data source", () => {
      const dataSource = createDataSource(createConnection());
      const template = new JsdbcTemplate(dataSource);

      expect(template.dataSource).toBe(dataSource);
    });
  });

  describe("update", () => {
    it("executes an update statement and closes the connection", async () => {
      const close = vi.fn(async () => {});
      const update = vi.fn(async () => 3);
      const connection = createConnection({ query: vi.fn(), update, close });
      const dataSource = createDataSource(connection);
      const template = new JsdbcTemplate(dataSource);

      await expect(
        template.update(sql`update users set name = 'Ada'`),
      ).resolves.toBe(3);
      expect(update).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it("closes the connection when update fails", async () => {
      const close = vi.fn(async () => {});
      const update = vi.fn(async () => {
        throw new Error("boom");
      });
      const connection = createConnection({ query: vi.fn(), update, close });
      const dataSource = createDataSource(connection);
      const template = new JsdbcTemplate(dataSource);

      await expect(
        template.update(sql`update users set name = 'Ada'`),
      ).rejects.toThrow("boom");
      expect(update).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it("reuses the current transaction connection without closing it", async () => {
      const close = vi.fn(async () => {});
      const update = vi.fn(async () => 3);
      const connection = createConnection({ query: vi.fn(), update, close });
      const getConnection = vi.fn(async () => {
        throw new Error(
          "should not fetch a new connection inside a transaction",
        );
      });
      const dataSource: DataSource = {
        getConnection,
        getDialect: vi.fn(async () => DatabaseDialect.POSTGRESQL),
        transaction: async <T>(
          callback: (connection: Connection) => Promise<T>,
        ): Promise<T> => callback(connection),
      };
      const template = new JsdbcTemplate(dataSource);

      await expect(
        TransactionSynchronizationManager.withResourceContext(
          dataSource,
          connection,
          async () => template.update(sql`update users set name = 'Ada'`),
        ),
      ).resolves.toBe(3);

      expect(getConnection).not.toHaveBeenCalled();
      expect(update).toHaveBeenCalledTimes(1);
      expect(close).not.toHaveBeenCalled();
    });
  });

  describe("transaction", () => {
    it("runs multiple template calls within one transaction context", async () => {
      const close = vi.fn(async () => {});
      const update = vi.fn(async () => 1);
      const query = vi.fn(async () => [{ id: 1 }]);
      const connection = createConnection({ query, update, close });
      const getConnection = vi.fn(async () => {
        throw new Error(
          "should not fetch a new connection inside a transaction",
        );
      });
      const dataSource: DataSource = {
        getConnection,
        getDialect: vi.fn(async () => DatabaseDialect.POSTGRESQL),
        transaction: async <T>(
          callback: (connection: Connection) => Promise<T>,
        ): Promise<T> =>
          TransactionSynchronizationManager.withResourceContext(
            dataSource,
            connection,
            () => callback(connection),
          ),
      };
      const template = new JsdbcTemplate(dataSource);

      await expect(
        template.transaction(async () => {
          await template.update(sql`update users set name = 'Ada'`);
          await template.queryForList(sql`select * from users`);
          return "done";
        }),
      ).resolves.toBe("done");

      expect(getConnection).not.toHaveBeenCalled();
      expect(update).toHaveBeenCalledTimes(1);
      expect(query).toHaveBeenCalledTimes(1);
      expect(close).not.toHaveBeenCalled();
    });
  });

  describe("queryForList", () => {
    it("infers row types from standard schema and single-column row mappers", async () => {
      const dataSource = createDataSource(createConnection());
      const template = new JsdbcTemplate(dataSource);

      const singleColumnResult = template.queryForList(
        sql`select value from items`,
        new SingleColumnRowMapper(Number),
      );
      expectTypeOf(await singleColumnResult).toEqualTypeOf<(number | null)[]>();

      const nonNullableSingleColumnResult = template.queryForList(
        sql`select conversation_id from chat`,
        new SingleColumnRowMapper(String, { nullable: false }),
      );
      expectTypeOf(await nonNullableSingleColumnResult).toEqualTypeOf<
        string[]
      >();

      const objectSchema: StandardSchemaV1<
        Record<string, unknown>,
        ConversationRowShape
      > = {
        "~standard": {
          version: 1,
          vendor: "test",
          types: {
            input: undefined as unknown as Record<string, unknown>,
            output: undefined as unknown as ConversationRowShape,
          },
          validate(value: unknown) {
            if (
              value !== null &&
              typeof value === "object" &&
              "conversation_id" in value &&
              "display_name" in value
            ) {
              return {
                value: {
                  conversationId: Number(
                    (value as Record<string, unknown>).conversation_id,
                  ),
                  displayName: String(
                    (value as Record<string, unknown>).display_name,
                  ),
                },
              };
            }

            return { issues: [{ message: "expected row object" }] };
          },
        },
      };

      const objectResult = template.queryForList(
        sql`select * from users`,
        new StandardSchemaRowMapper(objectSchema),
      );
      expectTypeOf(await objectResult).toEqualTypeOf<
        Array<{ conversationId: number; displayName: string }>
      >();

      const classTransformerResult = template.queryForList(
        sql`select * from users`,
        new ClassTransformerRowMapper(ConversationRow, {
          excludeExtraneousValues: true,
        }),
      );
      expectTypeOf(await classTransformerResult).toEqualTypeOf<
        ConversationRow[]
      >();
    });

    it("returns raw rows when no mapper is provided", async () => {
      const rows = [{ conversation_id: "1" }];
      const close = vi.fn(async () => {});
      const query = vi.fn(async () => rows);
      const connection = createConnection({ query, close });
      const dataSource = createDataSource(connection);
      const template = new JsdbcTemplate(dataSource);

      await expect(
        template.queryForList(sql`select conversation_id from chat`),
      ).resolves.toEqual(rows);
      expect(query).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it("maps single-column rows using a scalar row mapper", async () => {
      const rows = [{ CONVERSATION_ID: "1" }];
      const close = vi.fn(async () => {});
      const query = vi.fn(async () => rows);
      const connection = createConnection({ query, close });
      const dataSource = createDataSource(connection);
      const template = new JsdbcTemplate(dataSource);
      const rowMapper = new SingleColumnRowMapper(Number);

      await expect(
        template.queryForList(
          sql`select distinct conversation_id from chat`,
          rowMapper,
        ),
      ).resolves.toEqual([1]);
      expect(query).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it("maps rows using a standard schema row mapper", async () => {
      const rows = [{ CONVERSATION_ID: "1", DISPLAY_NAME: "Grace" }];
      const close = vi.fn(async () => {});
      const query = vi.fn(async () => rows);
      const connection = createConnection({ query, close });
      const dataSource = createDataSource(connection);
      const template = new JsdbcTemplate(dataSource);
      const rowMapper = new StandardSchemaRowMapper({
        "~standard": {
          version: 1,
          vendor: "test",
          validate(value: unknown) {
            if (
              value !== null &&
              typeof value === "object" &&
              "CONVERSATION_ID" in value &&
              "DISPLAY_NAME" in value
            ) {
              return {
                value: {
                  conversationId: Number(
                    (value as Record<string, unknown>).CONVERSATION_ID,
                  ),
                  displayName: String(
                    (value as Record<string, unknown>).DISPLAY_NAME,
                  ),
                },
              };
            }

            return { issues: [{ message: "expected row object" }] };
          },
        },
      } as StandardSchemaV1);

      await expect(
        template.queryForList(sql`select * from users`, rowMapper),
      ).resolves.toEqual([{ conversationId: 1, displayName: "Grace" }]);
      expect(query).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it("maps nullable scalar rows without conversion", async () => {
      const rows = [{ value: null }];
      const close = vi.fn(async () => {});
      const query = vi.fn(async () => rows);
      const connection = createConnection({ query, close });
      const dataSource = createDataSource(connection);
      const template = new JsdbcTemplate(dataSource);
      const rowMapper = new SingleColumnRowMapper(Number);

      await expect(
        template.queryForList(sql`select value from items`, rowMapper),
      ).resolves.toEqual([null]);
      expect(query).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it("maps rows using a row mapper function", async () => {
      const rows = [
        { id: 1, name: "Ada" },
        { id: 2, name: "Linus" },
      ];
      const close = vi.fn(async () => {});
      const query = vi.fn(async () => rows);
      const connection = createConnection({ query, close });
      const dataSource = createDataSource(connection);
      const template = new JsdbcTemplate(dataSource);
      const rowMapper: RowMapperFunction<{ id: number; name: string }> = (
        row,
        rowNum,
      ) => ({
        id: Number(row.id),
        name: `${rowNum}:${String(row.name)}`,
      });

      const result = await template.queryForList(
        sql`select * from users`,
        rowMapper,
      );

      expect(result).toEqual([
        { id: 1, name: "0:Ada" },
        { id: 2, name: "1:Linus" },
      ]);
      expect(query).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it("maps rows using a row mapper instance", async () => {
      const rows = [
        { id: 1, name: "Ada" },
        { id: 2, name: "Linus" },
      ];
      const close = vi.fn(async () => {});
      const query = vi.fn(async () => rows);
      const connection = createConnection({ query, close });
      const dataSource = createDataSource(connection);
      const template = new JsdbcTemplate(dataSource);
      const rowMapper: RowMapper<{ id: number; name: string }> = {
        async mapRow(row) {
          return {
            id: Number(row.id),
            name: String(row.name),
          };
        },
      };

      const result = await template.queryForList(
        sql`select * from users`,
        rowMapper,
      );

      expect(result).toEqual([
        { id: 1, name: "Ada" },
        { id: 2, name: "Linus" },
      ]);
      expect(query).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it("closes the connection when a row mapper instance throws", async () => {
      const rows = [{ id: 1 }];
      const close = vi.fn(async () => {});
      const query = vi.fn(async () => rows);
      const connection = createConnection({ query, close });
      const dataSource = createDataSource(connection);
      const template = new JsdbcTemplate(dataSource);
      const rowMapper: RowMapper<{ id: number }> = {
        async mapRow() {
          throw new Error("boom");
        },
      };

      await expect(
        template.queryForList(sql`select * from users`, rowMapper),
      ).rejects.toThrow("boom");
      expect(query).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
    });
  });
});

function createConnection(
  connection: {
    query?: (fragment: SqlFragment) => Promise<Record<string, unknown>[]>;
    update?: (fragment: SqlFragment) => Promise<number>;
    close?: () => Promise<void>;
  } = {},
): Connection {
  return {
    query: connection.query ?? vi.fn(async () => []),
    update: connection.update ?? vi.fn(async () => 0),
    close: connection.close ?? vi.fn(async () => {}),
  };
}

function createDataSource(connection: Connection): DataSource {
  const getConnection = vi.fn(async () => connection);
  const getDialect = vi.fn(async () => DatabaseDialect.POSTGRESQL);
  const transaction: DataSource["transaction"] = async <T>(
    callback: (connection: Connection) => Promise<T>,
  ) => callback(connection);

  return {
    getConnection,
    getDialect,
    transaction,
  };
}
