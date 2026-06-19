const LOL_VERSION = '14.11.1'; 
const LOL_API_URL = `https://ddragon.leagueoflegends.com/cdn/${LOL_VERSION}/data/en_US/champion.json`;
const VALO_API_URL = 'https://valorant-api.com/v1/agents?isPlayableCharacter=true';
const VALO_TIERS_URL = 'https://valorant-api.com/v1/competitivetiers';

export interface Champion {
  id: string;
  name: string;
  image: {
    full: string;
    sprite: string;
  };
  tags: string[]; 
  imageUrl?: string;
}

export interface Agent {
  uuid: string;
  displayName: string;
  displayIcon: string;
  role: {
    displayName: string;
  };
}

export const fetchLoLChampions = async (): Promise<Champion[]> => {
  const res = await fetch(LOL_API_URL);
  const data = await res.json();
  return Object.values(data.data).map((champ: any) => ({
    ...champ,
    imageUrl: `https://ddragon.leagueoflegends.com/cdn/${LOL_VERSION}/img/champion/${champ.image.full}`
  }));
};

export const fetchValorantAgents = async (): Promise<Agent[]> => {
  const res = await fetch(VALO_API_URL);
  const data = await res.json();
  return data.data;
};

let valoRankMapCache: Record<string, string> | null = null;

export const fetchValorantRanksMap = async (): Promise<Record<string, string>> => {
  if (valoRankMapCache) return valoRankMapCache;
  try {
    const res = await fetch(VALO_TIERS_URL);
    const data = await res.json();
    const episode = data.data[data.data.length - 1]; // Latest episode
    const map: Record<string, string> = {};
    for (const tier of episode.tiers) {
      if (tier.tierName && tier.largeIcon) {
        // e.g. "GOLD 1"
        const formattedName = tier.tierName.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        map[formattedName] = tier.largeIcon;
      }
    }
    valoRankMapCache = map;
    return map;
  } catch (err) {
    console.error('Failed to load valorant ranks', err);
    return {};
  }
};
