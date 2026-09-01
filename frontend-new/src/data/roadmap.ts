import {
  Bitcoin,
  Bot,
  Building2,
  Clock,
  CreditCard,
  Dna,
  Globe2,
  Hexagon,
  Route,
  Sun,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type MilestoneStatus = "completed" | "in-progress" | "planned";

export type Milestone = {
  id: string;
  /** Target date, quarter or half - shown as the pill label */
  period: string;
  title: string;
  description: string;
  status: MilestoneStatus;
  icon: LucideIcon;
};

/**
 * The single source of truth for the roadmap. `/roadmap` renders these in
 * order, so the list doubles as the timeline: reorder it and the curve, the
 * progress rail and the hero counts all follow.
 */
export const milestones: Milestone[] = [
  {
    id: "polygon-production",
    period: "Aug 2026",
    title: "Polygon Production Integration",
    description:
      "Bring the existing Polygon support into production and enable Skyline routes involving Polygon.",
    status: "completed",
    icon: Hexagon,
  },
  {
    id: "ethereum-production",
    period: "Sep 2026",
    title: "Ethereum Production Integration",
    description:
      "Bring the existing Ethereum support into production and expand Skyline connectivity to the Ethereum ecosystem.",
    status: "in-progress",
    icon: Globe2,
  },
  {
    id: "solana-production",
    period: "Oct 2026",
    title: "Solana Production Integration",
    description:
      "Bring the existing Solana support into production and expand Skyline connectivity to the Solana ecosystem.",
    status: "planned",
    icon: Sun,
  },
  {
    id: "genome-evm",
    period: "Jan 2027",
    title: "Genome Application Expansion to EVM",
    description:
      "Expand the existing genome application from AP3X Vector to the EVM ecosystem, demonstrating how applications can use Skyline to extend into additional blockchain ecosystems.",
    status: "planned",
    icon: Dna,
  },
  {
    id: "tempo-integration",
    period: "Q1 2027",
    title: "Tempo Integration",
    description:
      "Add Tempo as a Skyline-supported ecosystem, with particular relevance to payment-oriented infrastructure.",
    status: "planned",
    icon: Clock,
  },
  {
    id: "vifi-expansion",
    period: "Apr 2027",
    title: "ViFi Expansion",
    description:
      "Expand the ViFi integration based on the commercial and technical scope agreed with the ViFi team.",
    status: "planned",
    icon: Wifi,
  },
  {
    id: "native-bitcoin",
    period: "Q2 2027",
    title: "Native Bitcoin Support",
    description:
      "Enable native BTC interoperability between the Bitcoin network and other Skyline-supported ecosystems.",
    status: "planned",
    icon: Bitcoin,
  },
  {
    id: "ai-agent-access",
    period: "Q2 2027",
    title: "AI-Agent Access to Skyline",
    description:
      "Enable authorized AI agents to initiate and execute cross-chain transfers on behalf of users through the Skyline interface.",
    status: "planned",
    icon: Bot,
  },
  {
    id: "multi-hop-routing",
    period: "Q3 2027",
    title: "Multi-Hop Routing",
    description:
      "Enable Skyline to automatically route transfers through one or more intermediary chains when no direct route exists between the source and destination chains.",
    status: "planned",
    icon: Route,
  },
  {
    id: "canton-asset",
    period: "Q3 2027",
    title: "Canton Asset Interoperability",
    description:
      "Enable selected Canton-based assets to move between the Canton ecosystem and other Skyline-supported blockchain ecosystems.",
    status: "planned",
    icon: Building2,
  },
  {
    id: "bitcoin-asset-support",
    period: "Q4 2027",
    title: "Bitcoin Asset Support",
    description:
      "Expand Bitcoin support beyond native BTC to selected assets from the Bitcoin ecosystem. The specific asset scope will be defined based on ecosystem development and market demand.",
    status: "planned",
    icon: Bitcoin,
  },
  {
    id: "hybrid-intent",
    period: "H1 2028",
    title: "Hybrid Intent-Based Execution",
    description:
      "Enable fast execution through the Skyline relayer network. When a relayer accepts a transfer, it provides funds on the destination chain before canonical settlement; if no relayer accepts, the existing Skyline bridge flow remains the fallback.",
    status: "planned",
    icon: Zap,
  },
  {
    id: "agentic-payments",
    period: "H2 2028",
    title: "Agentic Payment Infrastructure",
    description:
      "Integrate Skyline with emerging machine and agent payment protocols such as x402 and MPP, enabling Skyline to provide the cross-chain execution required for an agent to complete a payment on the requested network.",
    status: "planned",
    icon: CreditCard,
  },
];

/** The target period of one milestone, for surfaces that are waiting on it. */
export function milestonePeriod(id: string): string | undefined {
  return milestones.find((milestone) => milestone.id === id)?.period;
}
