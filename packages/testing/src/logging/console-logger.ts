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

import { type ILoggerFactory, type Logger, LogLevel } from "@nestjs-port/core";

const ENV_LOG_LEVELS: Record<string, LogLevel> = {
  TRACE: LogLevel.TRACE,
  DEBUG: LogLevel.DEBUG,
  INFO: LogLevel.INFO,
  WARN: LogLevel.WARN,
  ERROR: LogLevel.ERROR,
};

const resolveMinimumLevelFromEnv = (): LogLevel | undefined => {
  const configuredLevel = process.env.LOG_LEVEL?.toUpperCase();
  if (!configuredLevel || !(configuredLevel in ENV_LOG_LEVELS)) {
    return undefined;
  }

  return ENV_LOG_LEVELS[configuredLevel];
};

export class ConsoleLogger implements Logger {
  constructor(
    public readonly name: string,
    private readonly minimumLevel?: LogLevel,
  ) {}

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
    return this.isEnabled(LogLevel.TRACE);
  }

  isDebugEnabled(): boolean {
    return this.isEnabled(LogLevel.DEBUG);
  }

  isInfoEnabled(): boolean {
    return this.isEnabled(LogLevel.INFO);
  }

  isWarnEnabled(): boolean {
    return this.isEnabled(LogLevel.WARN);
  }

  isErrorEnabled(): boolean {
    return this.isEnabled(LogLevel.ERROR);
  }

  private isEnabled(level: LogLevel): boolean {
    const configuredLevel = this.minimumLevel ?? resolveMinimumLevelFromEnv();
    return configuredLevel !== undefined && level >= configuredLevel;
  }
}

export class ConsoleLoggerFactory implements ILoggerFactory {
  constructor(private readonly minimumLevel?: LogLevel) {}

  getLogger(name: string): Logger {
    return new ConsoleLogger(name, this.minimumLevel);
  }
}
