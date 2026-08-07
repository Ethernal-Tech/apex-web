type TokenInfo = {
  tokenID: number;
  label: string;
};

let namesById = new Map<number, string>();

export function setTokenNames(
  tokens: Array<{ id: number; name: string }> | undefined,
): void {
  namesById = new Map((tokens ?? []).map((t) => [t.id, t.name]));
}

export function getTokenInfo(tokenID: number | undefined): TokenInfo {
  if (tokenID === undefined) {
    return { tokenID: 0, label: "" };
  }
  return {
    tokenID,
    label: namesById.get(tokenID) ?? `Token ${tokenID}`,
  };
}
