const STORAGE_KEY = "skyline.walletReturnTo";

function isSafePath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

function readStored(): string | undefined {
  if (typeof sessionStorage === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (typeof raw === "string" && isSafePath(raw)) return raw;
  } catch {
    // private mode / quota
  }
  return undefined;
}

/** Remember where to go after the wallet is connected on /bridge-app. */
export function setWalletReturnTo(path: string): void {
  if (!isSafePath(path)) return;
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, path);
  } catch {
    // private mode / quota
  }
}

export function peekWalletReturnTo(): string | undefined {
  return readStored();
}

export function clearWalletReturnTo(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // private mode / quota
  }
}
