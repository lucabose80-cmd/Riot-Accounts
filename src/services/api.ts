export interface Champion {
  id: string;
  key: string;
  name: string;
  title: string;
  image: {
    full: string;
    sprite: string;
  };
  tags: string[]; // Roles like Fighter, Mage, etc.
}

export interface Agent {
  uuid: string;
  displayName: string;
  description: string;
  displayIcon: string;
  role: {
    uuid: string;
    displayName: string;
    displayIcon: string;
  } | null;
}

export const fetchLoLChampions = async (): Promise<Champion[]> => {
  try {
    // Get latest version
    const versionRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
    const versions = await versionRes.json();
    const latestVersion = versions[0];

    // Fetch champions
    const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`);
    const data = await res.json();
    
    // Transform object map to array
    const championsArray: Champion[] = Object.values(data.data);
    
    // Append full image URL
    return championsArray.map(champ => ({
      ...champ,
      imageUrl: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${champ.image.full}`
    }));
  } catch (error) {
    console.error("Error fetching LoL champions:", error);
    return [];
  }
};

export const fetchValorantAgents = async (): Promise<Agent[]> => {
  try {
    const res = await fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true');
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching Valorant agents:", error);
    return [];
  }
};
