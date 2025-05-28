export interface RepSystemMessage {
    title: String;
    subtitle: String;
}

const repSystemMessages: readonly RepSystemMessage[] = [
    {
        title: "Have you checked your Reputation today?",
        subtitle: "Enhance your blockchain identity through daily, on-chain activity."
    },
    {
        title: "Your next Daily Quest might surprise you.",
        subtitle: "Enchance your reputation by completing quick blockchain tasks."
    },
    {
        title: "Reputation grows with action. Ready?",
        subtitle: "Build trust in Web3 with every transaction you make."
    },
    {
        title: "What's your blockchain reputation?",
        subtitle: "Discover how your activity shapes your digital identity."
    },
    {
        title: "Points. Perks. Progress. Let's go.",
        subtitle: "Turn your blockchain activity into measurable reputation."
    },
    {
        title: "Small actions, big reputation.",
        subtitle: "Complete simple tasks and grow your reputation today."
    },
    {
        title: "It's a good day to work your reputation.",
        subtitle: "Get rewarded for what you already do on-chain."
    },
    {
        title: "New Reputation challenges await.",
        subtitle: "Log in daily to complete quests and build your profile."
    },
    {
        title: "Click here. Start climbing the leaderboard.",
        subtitle: "Compete with others and grow your standing in the ecosystem."
    },
    {
        title: "Got 2 minutes? Earn rewards.",
        subtitle: "Fast, fun tasks that help boost your blockchain credibility."
    }
];

// Returns a title and subtitle to be shown on the transfer progress page
export const getRandomRepSystemMessage = (): RepSystemMessage => {
    const randomIndex = Math.floor(Math.random() * repSystemMessages.length);
    return repSystemMessages[randomIndex];
};