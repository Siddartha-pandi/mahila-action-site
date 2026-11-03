export interface Campaign {
  id: string;
  name: string;
  tag: string;
  raised: number;
  goal: number;
}

export const CAMPAIGNS: Campaign[] = [
  { id: "learning-centres", name: "Help Build Community Learning Centres", tag: "Education", raised: 0, goal: 600000 },
  { id: "women-leadership-fund", name: "Women Leadership Fund", tag: "Women & Leadership", raised: 0, goal: 500000 },
  { id: "skills-for-tomorrow", name: "Skills for Tomorrow", tag: "Livelihood & Skills", raised: 0, goal: 300000 },
  { id: "community-health-drive", name: "Community Health Drive", tag: "Community Wellbeing", raised: 0, goal: 600000 },
];

export function formatLakh(n: number) {
  if (n >= 100000) {
    return `₹${(n / 100000).toFixed(1)}L`;
  }
  return `₹${n.toLocaleString("en-IN")}`;
}
