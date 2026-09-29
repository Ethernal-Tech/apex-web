import { describe, expect, it } from "vitest";
import { errorFromUnknown, formatUserError } from "@/lib/formatUserError";

const HEX_ADDRESS =
  "017c205935db47e3274fd8f9fd9e8cf846b1291faef6430e9339de13478b4e2900167bf48e98803bb0ed0cd7c2f6b699a08716e8a520b507f9";

describe("formatUserError", () => {
  it("does not show a bare CIP-30 / CSL number as the whole message", () => {
    expect(formatUserError(909382424)).toBe(
      "Wallet error. Please try again (code 909382424).",
    );
    expect(formatUserError("909382424")).toBe(
      "Wallet error. Please try again (code 909382424).",
    );
    expect(formatUserError(new Error("909382424"))).toBe(
      "Wallet error. Please try again (code 909382424).",
    );
    expect(`${909382424}`).toBe("909382424");
  });

  it("uses wallet info text for Eternl timeout", () => {
    expect(
      formatUserError({
        code: -2,
        info: "Eternl API bridge request timed out",
        message: "Eternl API bridge request timed out",
        name: "Error",
      }),
    ).toBe("Eternl API bridge request timed out");

    expect(
      formatUserError(new Error("Eternl API bridge request timed out")),
    ).toBe("Eternl API bridge request timed out");
  });

  it("extracts Nest JSON message instead of dumping the body", () => {
    const body = JSON.stringify({
      statusCode: 400,
      message: `Invalid cardano destination address: ${HEX_ADDRESS}`,
      error: "Bad Request",
    });

    expect(formatUserError(new Error(body))).toBe(
      `Invalid cardano destination address: ${HEX_ADDRESS}`,
    );
    expect(formatUserError(`Error: ${body}`)).toBe(
      `Invalid cardano destination address: ${HEX_ADDRESS}`,
    );
  });

  it("never returns [object Object] for CIP-30 style throws", () => {
    expect(formatUserError({ code: -2 })).toBe(
      "Wallet had an internal error. Please try again.",
    );
    expect(`${{ code: -2 }}`).toBe("[object Object]");
  });

  it("uses CIP-30 info text for user decline, not the colliding numeric code", () => {
    expect(formatUserError({ code: 2, info: "User declined" })).toBe(
      "User declined",
    );
    expect(formatUserError({ code: 2 })).toBe(
      "Wallet error. Please try again (code 2).",
    );
  });
});

describe("errorFromUnknown", () => {
  it("wraps a numeric wallet rejection so toast.error(err.message) is readable", () => {
    const err = errorFromUnknown(909382424);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe(
      "Wallet error. Please try again (code 909382424).",
    );
    expect(err.cause).toBe(909382424);
  });
});
