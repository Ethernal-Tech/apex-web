/**
 * Hex colors only (#RGB, #RRGGBB, either with an alpha nibble), so a typo in a
 * config file is caught at load instead of ending up in a style attribute.
 */
export const HEX_COLOR_PATTERN =
	/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** The trimmed color, or undefined when `raw` is not a hex color. */
export const asHexColor = (raw: unknown): string | undefined => {
	if (typeof raw !== 'string') {
		return undefined;
	}
	const color = raw.trim();

	return HEX_COLOR_PATTERN.test(color) ? color : undefined;
};
