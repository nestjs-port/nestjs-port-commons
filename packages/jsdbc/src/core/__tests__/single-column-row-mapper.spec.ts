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

import { describe, expect, it } from "vitest";

import { SingleColumnRowMapper } from "../single-column-row-mapper.js";

describe("SingleColumnRowMapper", () => {
  it("converts string values", async () => {
    const mapper = new SingleColumnRowMapper(String);

    expect(await mapper.mapRow({ value: 123 }, 0)).toBe("123");
  });

  it("converts number values", async () => {
    const mapper = new SingleColumnRowMapper(Number);

    expect(await mapper.mapRow({ value: "1" }, 0)).toBe(1);
  });

  it("converts boolean values", async () => {
    const mapper = new SingleColumnRowMapper(Boolean);

    expect(await mapper.mapRow({ value: "true" }, 0)).toBe(true);
    expect(await mapper.mapRow({ value: "0" }, 0)).toBe(false);
  });

  it("converts date values", async () => {
    const mapper = new SingleColumnRowMapper(Date);

    expect(
      await mapper.mapRow({ value: "2026-04-13T00:00:00.000Z" }, 0),
    ).toEqual(new Date("2026-04-13T00:00:00.000Z"));
  });

  it("converts bigint values", async () => {
    const mapper = new SingleColumnRowMapper(BigInt);

    expect(await mapper.mapRow({ value: "42" }, 0)).toBe(42n);
  });

  it("returns null values as null", async () => {
    const mapper = new SingleColumnRowMapper(Number);

    expect(await mapper.mapRow({ value: null }, 0)).toBeNull();
  });

  it("rejects null values when nullable is false", async () => {
    const mapper = new SingleColumnRowMapper(Number, { nullable: false });

    await expect(mapper.mapRow({ value: null }, 0)).rejects.toThrow(
      "Expected a non-null single-column row at row number 0, but received null.",
    );
  });
});
