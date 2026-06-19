export interface RiotAccount {
  id?: string;
  userId: string;
  ingameName: string;
  server: string;
  loginName: string;
  password?: string;
  email?: string;
  lol: {
    level: number;
    rank: string;
    champions: string[];
  };
  valorant: {
    level: number;
    rank: string;
    characters: string[];
  };
  tft: {
    rank: string;
  };
  shareId?: string; // Legacy, optional now since we use shared_links collection
  lastAccessedBy?: string;
}

const buildLolRanks = () => {
  const tiers = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond'];
  const divisions = ['4', '3', '2', '1'];
  const ranks = ['Unranked'];
  for (const t of tiers) {
    for (const d of divisions) {
      ranks.push(`${t} ${d}`);
    }
  }
  ranks.push('Master', 'Grandmaster', 'Challenger');
  return ranks;
};

const buildValoRanks = () => {
  const tiers = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal'];
  const divisions = ['1', '2', '3'];
  const ranks = ['Unranked'];
  for (const t of tiers) {
    for (const d of divisions) {
      ranks.push(`${t} ${d}`);
    }
  }
  ranks.push('Radiant');
  return ranks;
};

export const LOL_RANKS = buildLolRanks();
export const VALORANT_RANKS = buildValoRanks();
export const TFT_RANKS = buildLolRanks(); // TFT shares the same structure as LoL

// Helper to get Rank icon
export const getRankIcon = (rank: string, game: 'lol' | 'valorant' | 'tft'): string | null => {
  if (!rank || rank === 'Unranked') return null;
  const baseTier = rank.split(' ')[0].toLowerCase();
  
  if (game === 'lol' || game === 'tft') {
    return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-mini-crests/${baseTier}.png`;
  }
  
  // For Valorant we can use a static mapping or use valorant-api assets
  // Valo API has competitive tiers but getting them requires a complex mapping or fetching.
  // For simplicity, we use a public repository or just the text if we can't find it.
  // Actually, Valo API provides icons for all tiers. 
  // Let's rely on a known public source or just fallback to text for now.
  // We can fetch from valorant-api in a component, or use a known static map.
  return null; // Handled in UI component dynamically if needed
};
