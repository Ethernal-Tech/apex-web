export function captureException(
  error: unknown,
  context?: { tags?: Record<string, string> },
): void {
  console.error("[wallet]", context?.tags ?? {}, error);
}

export function captureAndThrowError(
  message: unknown,
  component: string,
  action: string,
): never {
  const text =
    typeof message === "string"
      ? message
      : message instanceof Error
        ? message.message
        : String(message);
  const err = new Error(text);
  captureException(err, { tags: { component, action } });
  throw err;
}
