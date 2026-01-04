import { describe, expect, test } from "bun:test";
import { createSnapshot } from "../src/snapshot";

describe("snapshot", () => {
  test("createSnapshot is exported", () => {
    expect(typeof createSnapshot).toBe("function");
  });
});
