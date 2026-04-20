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

import type { ILoggerFactory, Logger } from "@nestjs-port/core";

const LOG_LEVELS: Record<string, number> = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
};

const isEnabled = (level: number): boolean => {
  const configuredLevel = process.env.LOG_LEVEL?.toUpperCase();
  if (!configuredLevel || !(configuredLevel in LOG_LEVELS)) return false;
  return level >= LOG_LEVELS[configuredLevel];
};

export class TestLogger implements Logger {
  constructor(public readonly name: string) {}

  trace(message: string, ...args: unknown[]): void {
    if (this.isTraceEnabled()) {
      console.trace(`[${this.name}] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.isDebugEnabled()) {
      console.debug(`[${this.name}] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.isInfoEnabled()) {
      console.info(`[${this.name}] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.isWarnEnabled()) {
      console.warn(`[${this.name}] ${message}`, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.isErrorEnabled()) {
      console.error(`[${this.name}] ${message}`, ...args);
    }
  }

  isTraceEnabled(): boolean {
    return isEnabled(LOG_LEVELS.TRACE);
  }

  isDebugEnabled(): boolean {
    return isEnabled(LOG_LEVELS.DEBUG);
  }

  isInfoEnabled(): boolean {
    return isEnabled(LOG_LEVELS.INFO);
  }

  isWarnEnabled(): boolean {
    return isEnabled(LOG_LEVELS.WARN);
  }

  isErrorEnabled(): boolean {
    return isEnabled(LOG_LEVELS.ERROR);
  }
}

export class TestLoggerFactory implements ILoggerFactory {
  getLogger(name: string): Logger {
    return new TestLogger(name);
  }
}
