import type { EIP6963AnnounceProviderEvent, EIP6963ProviderDetail } from "web3";

/**
 * EIP-6963 wallet discovery: every wallet announces its own provider, so we can
 * pick a specific one by rdns even when another extension took over
 * `window.ethereum`.
 * @see https://eips.ethereum.org/EIPS/eip-6963
 */

const ANNOUNCE_EVENT = "eip6963:announceProvider";
const REQUEST_EVENT = "eip6963:requestProvider";

export const METAMASK_RDNS = "io.metamask";

const announcedByRdns = new Map<string, EIP6963ProviderDetail>();
let listening = false;

function onAnnounce(event: Event) {
  const { detail } = event as EIP6963AnnounceProviderEvent;
  if (detail?.info?.rdns && detail.provider) {
    announcedByRdns.set(detail.info.rdns, detail);
  }
}

/** Provider announced by the wallet with the given rdns, if installed. */
export function findEip6963Provider(rdns: string): unknown {
  if (typeof window === "undefined") return undefined;

  if (!listening) {
    window.addEventListener(ANNOUNCE_EVENT, onAnnounce);
    listening = true;
  }

  // Wallets announce synchronously in response, so the map is up to date
  // right after dispatch - this also picks up extensions injected late.
  window.dispatchEvent(new Event(REQUEST_EVENT));

  return announcedByRdns.get(rdns)?.provider;
}
