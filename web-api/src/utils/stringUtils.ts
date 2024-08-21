export const splitStringIntoChunks = (
	str: string,
	size: number = 40,
): string[] => {
	const numChunks = Math.ceil(str.length / size);
	const chunks: string[] = [];

	for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
		chunks.push(str.substring(o, o + size));
	}

	return chunks;
};

export const capitalizeWord = (word: string): string => {
	if (!word || word.length === 0) {
		return word;
	}

	return `${word[0].toUpperCase()}${word.substring(1)}`;
};
