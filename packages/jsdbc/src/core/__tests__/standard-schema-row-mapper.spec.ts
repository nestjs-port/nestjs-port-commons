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

import type { StandardSchemaV1 } from "@standard-schema/spec";
import { SchemaError } from "@standard-schema/utils";
import { type } from "arktype";
import * as v from "valibot";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { StandardSchemaRowMapper } from "../standard-schema-row-mapper.js";

describe("StandardSchemaRowMapper", () => {
  it("maps rows with Zod", async () => {
    const mapper = new StandardSchemaRowMapper(
      z
        .object({
          conversation_id: z.coerce.number(),
          display_name: z.string(),
        })
        .transform(({ conversation_id, display_name }) => ({
          conversationId: conversation_id,
          displayName: display_name,
        })),
    );

    await expect(
      mapper.mapRow({ conversation_id: "1", display_name: "Grace" }, 0),
    ).resolves.toEqual({
      conversationId: 1,
      displayName: "Grace",
    });
  });

  it("maps rows with Valibot", async () => {
    const mapper = new StandardSchemaRowMapper(
      v.pipe(
        v.object({
          conversation_id: v.number(),
          display_name: v.string(),
        }),
        v.transform(({ conversation_id, display_name }) => ({
          conversationId: conversation_id,
          displayName: display_name,
        })),
      ),
    );

    await expect(
      mapper.mapRow({ conversation_id: 1, display_name: "Grace" }, 0),
    ).resolves.toEqual({
      conversationId: 1,
      displayName: "Grace",
    });
  });

  it("maps rows with ArkType", async () => {
    const mapper = new StandardSchemaRowMapper(
      type({
        conversation_id: "number",
        display_name: "string",
      }).pipe(({ conversation_id, display_name }) => ({
        conversationId: conversation_id,
        displayName: display_name,
      })),
    );

    await expect(
      mapper.mapRow({ conversation_id: 1, display_name: "Grace" }, 0),
    ).resolves.toEqual({
      conversationId: 1,
      displayName: "Grace",
    });
  });

  it("throws a SchemaError when validation fails", async () => {
    const mapper = new StandardSchemaRowMapper(
      z.object({
        conversation_id: z.number(),
      }),
    );

    await expect(
      mapper.mapRow({ conversation_id: "not-a-number" }, 4),
    ).rejects.toBeInstanceOf(SchemaError);
  });

  it("supports async validation", async () => {
    const schema = {
      "~standard": {
        version: 1,
        vendor: "test",
        async validate(value: unknown) {
          if (
            value !== null &&
            typeof value === "object" &&
            "conversation_id" in value
          ) {
            return {
              value: {
                conversationId: Number(
                  (value as Record<string, unknown>).conversation_id,
                ),
              },
            };
          }

          return { issues: [{ message: "expected row object" }] };
        },
      },
    } as StandardSchemaV1;

    const mapper = new StandardSchemaRowMapper(schema);

    await expect(mapper.mapRow({ conversation_id: "7" }, 0)).resolves.toEqual({
      conversationId: 7,
    });
  });
});
