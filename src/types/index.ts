export interface HistoryEntry {
  timestamp: number;
  user: string;
  action: string;
}

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
  notes?: string;
  mainRoles?: string[];
  shareId?: string; // Legacy
  lastAccessedBy?: string;
  history?: HistoryEntry[];
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
export const TFT_RANKS = buildLolRanks();

export const getRankIcon = (rank: string, game: 'lol' | 'valorant' | 'tft'): string | null => {
  if (!rank || rank === 'Unranked') return null;
  const baseTier = rank.split(' ')[0].toLowerCase();
  
  if (game === 'lol' || game === 'tft') {
    return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/${baseTier}.png`;
  }
  
  return null; 
};
