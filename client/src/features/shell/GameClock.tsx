import { useEffect, useState } from "react";
import { formatGameTime, gameTimeFromReal } from "@/gameTime";

const TICK_MS = 250;

export function GameClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const time = formatGameTime(now);
  const { hours } = gameTimeFromReal(now);
  const night = hours < 6 || hours >= 21;

  return (
    <time
      className={`game-clock ${night ? "night" : "day"}`}
      dateTime={time}
      title="Сутки в игре равны одному реальному часу. 00:00 — в начале каждого часа."
    >
      <span className="game-clock-label">Игра</span>
      <span className="game-clock-time">{time}</span>
    </time>
  );
}
