const REAL_MS_PER_GAME_DAY = 60 * 60 * 1000;
const GAME_MINUTES_PER_DAY = 24 * 60;

export function gameTimeFromReal(now = new Date()) {
  const msIntoHour =
    now.getMinutes() * 60_000 + now.getSeconds() * 1000 + now.getMilliseconds();
  const gameMinutes = Math.floor((msIntoHour / REAL_MS_PER_GAME_DAY) * GAME_MINUTES_PER_DAY);
  return {
    hours: Math.floor(gameMinutes / 60) % 24,
    minutes: gameMinutes % 60,
  };
}

export function formatGameTime(now = new Date()) {
  const { hours, minutes } = gameTimeFromReal(now);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
