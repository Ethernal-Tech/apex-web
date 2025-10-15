import { TokenEnum } from "../features/enums";
import { getTokenInfo } from "../settings/token";
import { ChainEnum } from "../swagger/apexBridgeApiService";

export const decodeHex = (hex: string) => {
  try {
    return decodeURIComponent(hex.replace(/(..)/g, "%$1"));
  } catch (e) {
    return "[InvalidHex]";
  }
};

const asTokenEnum = (s: string): TokenEnum | undefined => {
  const vals = Object.values(TokenEnum) as string[];
  return vals.includes(s) ? (s as TokenEnum) : undefined;
};

export function decodeTokenKey(tokenKey: string, chain?: string): string {
  if (chain === ChainEnum.Cardano) return getTokenInfo(TokenEnum.WAPEX).label;
  if (tokenKey === "lovelace" || tokenKey === "amount") return getTokenInfo(TokenEnum.APEX).label;

  const hex = tokenKey.split(".")[1];
  if (!hex) return tokenKey;

  const decoded = decodeHex(hex);
  const candidates = [
    decoded,
    hex,
  ];
  

  for (const c of candidates) {
    const t = asTokenEnum(c);
    if (t) return getTokenInfo(t).label;
  }

  return decoded && !/invalid\s*hex/i.test(decoded) ? decoded : tokenKey;
}

export const isApexChain = (c: string) =>
  c === ChainEnum.Prime || c === ChainEnum.Nexus || c === ChainEnum.Vector;
