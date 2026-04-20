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

export interface RecordingLoggerEntry {
  level: LogLevel;
  message: string;
  args: unknown[];
}

export class RecordingLogger implements Logger {
  public readonly entries: RecordingLoggerEntry[] = [];

  constructor(public readonly name: string) {}

  trace(message: string, ...args: unknown[]): void {
    this.entries.push({ level: LogLevel.TRACE, message, args });
  }

  debug(message: string, ...args: unknown[]): void {
    this.entries.push({ level: LogLevel.DEBUG, message, args });
  }

  info(message: string, ...args: unknown[]): void {
    this.entries.push({ level: LogLevel.INFO, message, args });
  }

  warn(message: string, ...args: unknown[]): void {
    this.entries.push({ level: LogLevel.WARN, message, args });
  }

  error(message: string, ...args: unknown[]): void {
    this.entries.push({ level: LogLevel.ERROR, message, args });
  }

  isTraceEnabled(): boolean {
    return true;
  }

  isDebugEnabled(): boolean {
    return true;
  }

  isInfoEnabled(): boolean {
    return true;
  }

  isWarnEnabled(): boolean {
    return true;
  }

  isErrorEnabled(): boolean {
    return true;
  }
}

export class RecordingLoggerFactory implements ILoggerFactory {
  getLogger(name: string): Logger {
    return new RecordingLogger(name);
  }
}
