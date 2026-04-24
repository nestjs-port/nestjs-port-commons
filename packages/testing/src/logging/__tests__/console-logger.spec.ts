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
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsoleLogger, ConsoleLoggerFactory } from "../console-logger.js";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("ConsoleLogger", () => {
  it("keeps logging disabled when LOG_LEVEL is unset", () => {
    const logger = new ConsoleLogger("ConsoleLogger");

    expect(logger.isTraceEnabled()).toBe(false);
    expect(logger.isDebugEnabled()).toBe(false);
    expect(logger.isInfoEnabled()).toBe(false);
    expect(logger.isWarnEnabled()).toBe(false);
    expect(logger.isErrorEnabled()).toBe(false);
  });

  it("uses the constructor level when provided", () => {
    const logger = new ConsoleLogger("ConsoleLogger", LogLevel.DEBUG);

    expect(logger.isTraceEnabled()).toBe(false);
    expect(logger.isDebugEnabled()).toBe(true);
    expect(logger.isInfoEnabled()).toBe(true);
    expect(logger.isWarnEnabled()).toBe(true);
    expect(logger.isErrorEnabled()).toBe(true);
  });

  it("falls back to LOG_LEVEL when constructor level is not provided", () => {
    vi.stubEnv("LOG_LEVEL", "DEBUG");
    const logger = new ConsoleLogger("ConsoleLogger");

    expect(logger.isTraceEnabled()).toBe(false);
    expect(logger.isDebugEnabled()).toBe(true);
    expect(logger.isInfoEnabled()).toBe(true);
    expect(logger.isWarnEnabled()).toBe(true);
    expect(logger.isErrorEnabled()).toBe(true);
  });

  it("logs messages at or above the configured level", () => {
    vi.stubEnv("LOG_LEVEL", "INFO");
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => void 0);
    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => void 0);

    const logger = new ConsoleLogger("ConsoleLogger");
    logger.debug("hidden");
    logger.info("visible");

    expect(logger.isDebugEnabled()).toBe(false);
    expect(logger.isInfoEnabled()).toBe(true);
    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith("[ConsoleLogger] visible");
  });

  it("creates named loggers through the factory", () => {
    const logger = new ConsoleLoggerFactory().getLogger("FactoryLogger");

    expect(logger.name).toBe("FactoryLogger");
  });

  it("passes the configured level through the factory", () => {
    const logger = new ConsoleLoggerFactory(LogLevel.ERROR).getLogger(
      "FactoryLogger",
    );

    expect(logger.isWarnEnabled()).toBe(false);
    expect(logger.isErrorEnabled()).toBe(true);
  });
});
