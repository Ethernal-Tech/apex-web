import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Discovery = typeof import("@/lib/wallet/eip6963");

/** Simulates a wallet extension answering EIP-6963 requests. */
function installWallet(rdns: string, provider: object) {
  const announce = () =>
    window.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", {
        detail: { info: { uuid: rdns, name: rdns, icon: "", rdns }, provider },
      }),
    );
  window.addEventListener("eip6963:requestProvider", announce);
}

describe("eip6963", () => {
  let discovery: Discovery;

  beforeEach(async () => {
    vi.stubGlobal("window", new EventTarget());
    vi.resetModules();
    discovery = await import("@/lib/wallet/eip6963");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("finds MetaMask among other announced wallets", () => {
    const metamask = { name: "metamask" };
    installWallet("com.other.wallet", { name: "other" });
    installWallet(discovery.METAMASK_RDNS, metamask);

    expect(discovery.findEip6963Provider(discovery.METAMASK_RDNS)).toBe(
      metamask,
    );
  });

  it("returns undefined when MetaMask is not installed", () => {
    installWallet("com.other.wallet", { name: "other" });

    expect(
      discovery.findEip6963Provider(discovery.METAMASK_RDNS),
    ).toBeUndefined();
  });

  it("picks up a wallet injected after the first lookup", () => {
    expect(
      discovery.findEip6963Provider(discovery.METAMASK_RDNS),
    ).toBeUndefined();

    const metamask = { name: "metamask" };
    installWallet(discovery.METAMASK_RDNS, metamask);

    expect(discovery.findEip6963Provider(discovery.METAMASK_RDNS)).toBe(
      metamask,
    );
  });
});
