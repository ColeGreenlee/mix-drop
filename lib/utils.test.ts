import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("utils", () => {
  describe("cn", () => {
    it("should merge class names", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("should handle conditional classes", () => {
      expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
    });

    it("should merge Tailwind classes correctly", () => {
      // twMerge should deduplicate and merge Tailwind classes
      expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
    });

    it("should handle arrays of classes", () => {
      expect(cn(["foo", "bar"])).toBe("foo bar");
    });

    it("should handle undefined and null", () => {
      expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
    });

    it("should handle objects with boolean values", () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
    });

    it("should handle empty input", () => {
      expect(cn()).toBe("");
    });

    it("should handle complex Tailwind class conflicts", () => {
      // Later classes should override earlier ones
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    });
  });
});
