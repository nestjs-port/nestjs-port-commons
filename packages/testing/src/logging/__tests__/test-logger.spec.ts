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

import { afterEach, describe, expect, it, vi } from "vitest";
import { TestLogger, TestLoggerFactory } from "../test-logger";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("TestLogger", () => {
  it("keeps logging disabled when LOG_LEVEL is unset", () => {
    const logger = new TestLogger("TestLogger");

    expect(logger.isTraceEnabled()).toBe(false);
    expect(logger.isDebugEnabled()).toBe(false);
    expect(logger.isInfoEnabled()).toBe(false);
    expect(logger.isWarnEnabled()).toBe(false);
    expect(logger.isErrorEnabled()).toBe(false);
  });

  it("logs messages at or above the configured level", () => {
    vi.stubEnv("LOG_LEVEL", "INFO");
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => void 0);
    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => void 0);

    const logger = new TestLogger("TestLogger");
    logger.debug("hidden");
    logger.info("visible");

    expect(logger.isDebugEnabled()).toBe(false);
    expect(logger.isInfoEnabled()).toBe(true);
    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith("[TestLogger] visible");
  });

  it("creates named loggers through the factory", () => {
    const logger = new TestLoggerFactory().getLogger("FactoryLogger");

    expect(logger.name).toBe("FactoryLogger");
  });
});
