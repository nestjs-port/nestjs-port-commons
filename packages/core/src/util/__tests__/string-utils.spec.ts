import { describe, expect, it } from "vitest";

import { StringUtils } from "../string-utils";

describe("StringUtils", () => {
  describe("hasText", () => {
    it("should return true when value is non-empty text", () => {
      expect(StringUtils.hasText("hello")).toBe(true);
    });

    it("should return true when value has leading and trailing spaces", () => {
      expect(StringUtils.hasText("  hello  ")).toBe(true);
    });

    it("should return false for empty string", () => {
      expect(StringUtils.hasText("")).toBe(false);
    });

    it("should return false for whitespace-only string", () => {
      expect(StringUtils.hasText("   ")).toBe(false);
    });

    it("should return false for non-string values", () => {
      expect(StringUtils.hasText(null)).toBe(false);
      expect(StringUtils.hasText(undefined)).toBe(false);
      expect(StringUtils.hasText(123)).toBe(false);
      expect(StringUtils.hasText({})).toBe(false);
    });
  });

  describe("countOccurrences", () => {
    it("should count occurrences of a substring", () => {
      expect(StringUtils.countOccurrences("a,b,c", ",")).toBe(2);
    });

    it("should return zero when substring is not found", () => {
      expect(StringUtils.countOccurrences("abcdef", "z")).toBe(0);
    });

    it("should return zero when substring is empty", () => {
      expect(StringUtils.countOccurrences("abcdef", "")).toBe(0);
    });

    it("should count non-overlapping substring occurrences", () => {
      expect(StringUtils.countOccurrences("aaaa", "aa")).toBe(2);
    });
  });
});
