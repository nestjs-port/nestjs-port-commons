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

import { LogLevel } from "@nestjs-port/core";
import { describe, expect, it } from "vitest";
import { RecordingLogger, RecordingLoggerFactory } from "../recording-logger";

describe("RecordingLogger", () => {
  it("records level, message, and args for each call", () => {
    const logger = new RecordingLogger("RecordingLogger");
    const error = new Error("boom");

    logger.trace("trace message");
    logger.debug("debug message", 1, "two");
    logger.info("info message", { ok: true });
    logger.warn("warn message", error);
    logger.error("error message", null);

    expect(logger.entries).toEqual([
      { level: LogLevel.TRACE, message: "trace message", args: [] },
      { level: LogLevel.DEBUG, message: "debug message", args: [1, "two"] },
      { level: LogLevel.INFO, message: "info message", args: [{ ok: true }] },
      { level: LogLevel.WARN, message: "warn message", args: [error] },
      { level: LogLevel.ERROR, message: "error message", args: [null] },
    ]);
  });

  it("reports all log levels as enabled", () => {
    const logger = new RecordingLogger("RecordingLogger");

    expect(logger.isTraceEnabled()).toBe(true);
    expect(logger.isDebugEnabled()).toBe(true);
    expect(logger.isInfoEnabled()).toBe(true);
    expect(logger.isWarnEnabled()).toBe(true);
    expect(logger.isErrorEnabled()).toBe(true);
  });

  it("creates named loggers through the factory", () => {
    const logger = new RecordingLoggerFactory().getLogger("FactoryLogger");

    expect(logger.name).toBe("FactoryLogger");
  });
});
