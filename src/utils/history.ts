import type { RiotAccount } from '../types';

export const generateHistoryDiff = (oldAcc: RiotAccount, newAcc: RiotAccount): string[] => {
  const diffs: string[] = [];

  if (oldAcc.lol?.level !== newAcc.lol?.level) {
    diffs.push(`LoL Level von ${oldAcc.lol?.level || 1} auf ${newAcc.lol?.level} geändert`);
  }
  if (oldAcc.lol?.rank !== newAcc.lol?.rank) {
    diffs.push(`LoL Rang von ${oldAcc.lol?.rank || 'Unranked'} auf ${newAcc.lol?.rank} geändert`);
  }
  const oldLolChamps = oldAcc.lol?.champions?.length || 0;
  const newLolChamps = newAcc.lol?.champions?.length || 0;
  if (oldLolChamps !== newLolChamps) {
    const diff = newLolChamps - oldLolChamps;
    diffs.push(`${Math.abs(diff)} LoL Champions ${diff > 0 ? 'hinzugefügt' : 'entfernt'}`);
  }

  if (oldAcc.valorant?.level !== newAcc.valorant?.level) {
    diffs.push(`Valorant Level von ${oldAcc.valorant?.level || 1} auf ${newAcc.valorant?.level} geändert`);
  }
  if (oldAcc.valorant?.rank !== newAcc.valorant?.rank) {
    diffs.push(`Valorant Rang von ${oldAcc.valorant?.rank || 'Unranked'} auf ${newAcc.valorant?.rank} geändert`);
  }
  const oldValoChars = oldAcc.valorant?.characters?.length || 0;
  const newValoChars = newAcc.valorant?.characters?.length || 0;
  if (oldValoChars !== newValoChars) {
    const diff = newValoChars - oldValoChars;
    diffs.push(`${Math.abs(diff)} Valorant Agenten ${diff > 0 ? 'hinzugefügt' : 'entfernt'}`);
  }

  if (oldAcc.tft?.rank !== newAcc.tft?.rank) {
    diffs.push(`TFT Rang von ${oldAcc.tft?.rank || 'Unranked'} auf ${newAcc.tft?.rank} geändert`);
  }

  return diffs;
};
