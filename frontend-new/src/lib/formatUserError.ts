const FALLBACK = "Something went wrong. Please try again.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function firstUsefulString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const text = value.trim();
    if (!text || text === "[object Object]") continue;
    return text;
  }
}

function messageFromObject(obj: Record<string, unknown>): string | undefined {
  // NestJS uses `error: "Bad Request"` — prefer `message` / CIP-30 `info`.
  return firstUsefulString(obj.info, obj.message, obj.err, obj.shortMessage);
}

function parseJsonBlob(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return undefined;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return isRecord(parsed) ? messageFromObject(parsed) : undefined;
  } catch {
    return undefined;
  }
}

function stripErrorPrefix(text: string): string {
  return text.replace(/^Error:\s*/i, "").trim();
}

function asNumericCode(text: string): number | undefined {
  const stripped = stripErrorPrefix(text);
  if (!/^-?\d+$/.test(stripped)) return undefined;
  const code = Number(stripped);
  return Number.isSafeInteger(code) ? code : undefined;
}

/**
 * @see https://cips.cardano.org/cip/CIP-0030
 */
function fromNumericCode(code: number): string {
  switch (code) {
    case -1:
      return "Wallet request was invalid. Please try again.";
    case -2:
      return "Wallet had an internal error. Please try again.";
    case -3:
      return "Wallet refused access. Please reconnect and try again.";
    case -4:
      return "Wallet account changed. Please reconnect.";
    default:
      return `Wallet error. Please try again (code ${code}).`;
  }
}

function fromUnknown(err: unknown, depth = 0): string | undefined {
  if (err == null || depth > 4) return undefined;

  if (typeof err === "number" && Number.isFinite(err)) {
    return fromNumericCode(err);
  }

  if (typeof err === "bigint") {
    return fromNumericCode(Number(err));
  }

  if (typeof err === "string") {
    const fromJson = parseJsonBlob(stripErrorPrefix(err));
    if (fromJson) return fromJson;
    const code = asNumericCode(err);
    if (code !== undefined) return fromNumericCode(code);
    return stripErrorPrefix(err);
  }

  if (err instanceof Error) {
    const extra = err as Error & { info?: unknown; code?: unknown };
    const fromInfo = firstUsefulString(extra.info);
    if (fromInfo) return fromInfo;

    const fromJson = parseJsonBlob(err.message);
    if (fromJson) return fromJson;

    const fromMessage = fromUnknown(err.message, depth + 1);
    if (fromMessage) return fromMessage;

    if (typeof extra.code === "number") return fromNumericCode(extra.code);
    if (err.cause !== undefined) return fromUnknown(err.cause, depth + 1);
    return undefined;
  }

  if (isRecord(err)) {
    const extracted = messageFromObject(err);
    if (extracted) {
      const fromJson = parseJsonBlob(extracted);
      if (fromJson) return fromJson;
      return extracted;
    }
    if (typeof err.code === "number") return fromNumericCode(err.code);
    if ("reason" in err) return fromUnknown(err.reason, depth + 1);
    if ("error" in err && err.error !== "Bad Request") {
      return fromUnknown(err.error, depth + 1);
    }
  }
}

/** Human-readable copy for toasts. Never returns "[object Object]" or a bare error code. */
export function formatUserError(err: unknown, fallback = FALLBACK): string {
  const formatted = fromUnknown(err)?.trim();
  if (!formatted || formatted === "[object Object]") return fallback;
  return formatted;
}

export function errorFromUnknown(err: unknown, fallback = FALLBACK): Error {
  if (err instanceof Error) {
    const formatted = formatUserError(err, fallback);
    if (err.message === formatted) return err;
    const wrapped = new Error(formatted);
    wrapped.cause = err;
    return wrapped;
  }
  const wrapped = new Error(formatUserError(err, fallback));
  wrapped.cause = err;
  return wrapped;
}
