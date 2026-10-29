export function shuffle(items, random = Math.random) {
  const out = [...items];
  for (let index = out.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [out[index], out[swap]] = [out[swap], out[index]];
  }
  return out;
}
export function applyTournamentCompletion(data, series) {
  data.completed[series] = (data.completed[series] || 0) + 1;
  if (series === 'metal') data.ragoUnlocked = true;
  return data;
}

export function createTournament(series, player, bladers, stadiums, random = Math.random) {
  const pool = bladers.filter((entry) => entry.series === series && entry.id !== player.id && !entry.boss);
  const finalBoss = series === 'metal'
    ? (player.id === 'rago' ? bladers.find((entry) => entry.id === 'gingka') : bladers.find((entry) => entry.id === 'rago'))
    : (player.id === 'lui' ? bladers.find((entry) => entry.id === 'shu') : bladers.find((entry) => entry.id === 'lui'));
  const regular = shuffle(pool.filter((entry) => entry.id !== finalBoss?.id), random).slice(0, 3);
  const normalStages = shuffle(stadiums.filter((entry) => !entry.boss && (!entry.series || entry.series === series)), random).slice(0, 3);
  const finalStage = series === 'metal' ? stadiums.find((entry) => entry.id === 'nemesis') : stadiums.find((entry) => entry.id === 'evolution');
  return { series, player, round: 0, opponents: [...regular, finalBoss], stages: [...normalStages, finalStage], levels: [0.45,0.65,0.85,1] };
}
