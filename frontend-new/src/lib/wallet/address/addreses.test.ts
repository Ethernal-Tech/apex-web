import { describe, expect, it } from "vitest";
import {
  bech32FromCip30Address,
  NewAddressFromBytes,
} from "@/lib/wallet/address/addreses";
import { CardanoNetworkType } from "@/lib/wallet/address/types";
import { toBytes } from "@/lib/wallet/utils";

const CIP30_HEX =
  "017c205935db47e3274fd8f9fd9e8cf846b1291faef6430e9339de13478b4e2900167bf48e98803bb0ed0cd7c2f6b699a08716e8a520b507f9";

const BECH32 =
  "addr1q97zqkf4mdr7xf60mrulm85vlprtz2gl4mmyxr5n880px3utfc5sq9nm7j8f3qpmkrkse47z76mfngy8zm522g94qlusvydjul";

describe("bech32FromCip30Address", () => {
  it("converts CIP-30 hex to bech32", () => {
    expect(bech32FromCip30Address(CIP30_HEX)).toBe(BECH32);
  });

  it("passes through an already-bech32 address", () => {
    expect(bech32FromCip30Address(BECH32)).toBe(BECH32);
  });

  it("returns undefined for garbage instead of echoing hex", () => {
    expect(bech32FromCip30Address("not-an-address")).toBeUndefined();
    expect(bech32FromCip30Address("00")).toBeUndefined();
  });
});

describe("CardanoAddress.String", () => {
  it("treats networkId 0 as testnet, not as a missing override", () => {
    const addr = NewAddressFromBytes(toBytes(CIP30_HEX));
    expect(addr?.String(CardanoNetworkType.TestNetNetwork)).toMatch(
      /^addr_test1/,
    );
  });
});
