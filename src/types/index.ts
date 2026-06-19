export interface RiotAccount {
  id?: string;
  userId: string;
  ingameName: string;
  tag: string;
  loginName: string;
  password?: string; // Optional for shared view
  email?: string;    // Optional for shared view
  lol: {
    level: number;
    rank: string;
    champions: string[]; // Array of champion IDs
  };
  valorant: {
    level: number;
    rank: string;
    characters: string[]; // Array of agent UUIDs
  };
  shareId: string;
  lastAccessedBy?: string;
}

export const LOL_RANKS = [
  'Unranked', 'Iron', 'Bronze', 'Silver', 'Gold', 
  'Platinum', 'Emerald', 'Diamond', 'Master', 
  'Grandmaster', 'Challenger'
];

export const VALORANT_RANKS = [
  'Unranked', 'Iron', 'Bronze', 'Silver', 'Gold', 
  'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'
];
