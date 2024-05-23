export const capitalizeWord = (word: string): string => {
    if (word.length === 0) {
        return word;
    }

    return `${word[0].toUpperCase()}${word.substring(1)}`
}