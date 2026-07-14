import { describe, expect, it } from "vitest";
import {
  severityForBrokenImage,
  severityForConsoleError,
  severityForDeadControl,
  severityForDeadLink,
  severityForFailedRequest,
  severityForHttpStatus,
  severityForRuntimeError,
} from "@/audit/findings/severity";

describe("severityForHttpStatus", () => {
  it("maps 5xx to high", () => {
    expect(severityForHttpStatus(500)).toBe("high");
    expect(severityForHttpStatus(503)).toBe("high");
  });

  it("maps 404 to medium", () => {
    expect(severityForHttpStatus(404)).toBe("medium");
  });

  it("maps other 4xx to medium", () => {
    expect(severityForHttpStatus(403)).toBe("medium");
  });

  it("maps below 400 to info", () => {
    expect(severityForHttpStatus(200)).toBe("info");
    expect(severityForHttpStatus(301)).toBe("info");
  });
});

describe("severityForDeadLink", () => {
  it("treats unreachable (null status) as high", () => {
    expect(severityForDeadLink(null)).toBe("high");
  });

  it("delegates to severityForHttpStatus when a status is present", () => {
    expect(severityForDeadLink(404)).toBe(severityForHttpStatus(404));
    expect(severityForDeadLink(500)).toBe(severityForHttpStatus(500));
  });
});

describe("severityForConsoleError", () => {
  it("escalates uncaught/type/reference errors to high", () => {
    expect(severityForConsoleError("Uncaught TypeError: x is not a function")).toBe("high");
    expect(severityForConsoleError("ReferenceError: foo is not defined")).toBe("high");
  });

  it("defaults other console errors to medium", () => {
    expect(severityForConsoleError("Failed to load resource: 404")).toBe("medium");
  });
});

describe("fixed-severity checks", () => {
  it("returns the documented constant severities", () => {
    expect(severityForFailedRequest()).toBe("high");
    expect(severityForRuntimeError()).toBe("high");
    expect(severityForBrokenImage()).toBe("low");
    expect(severityForDeadControl()).toBe("medium");
  });
});
