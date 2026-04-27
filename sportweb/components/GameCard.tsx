"use client";

import TeamLogoBadge from "@/components/TeamLogoBadge";
import { Game } from "@/types/game";

type Props = {
  game: Game;
  onOpen: (game: Game) => void;
  viewMode: "예정경기" | "경기결과" | "순위" | "대진표";
};

function getBadgeText(game: Game, viewMode: Props["viewMode"]) {
  if (viewMode === "예정경기") return "예정";
  if (game.status === "LIVE") return "LIVE";
  return "종료";
}

function getBadgeClass(game: Game, viewMode: Props["viewMode"]) {
  if (viewMode === "예정경기") return "bg-slate-200 text-slate-700";
  if (game.status === "LIVE") return "bg-red-500 text-white";
  return "bg-slate-200 text-slate-700";
}

export default function GameCard({ game, onOpen, viewMode }: Props) {
  const showScore = viewMode !== "예정경기";
  const timeText = game.timeLabel || "-";

  return (
    <div className="mx-auto w-full max-w-[960px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="bg-gradient-to-r from-slate-950 to-slate-800 px-5 py-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-white/90">{game.league}</div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${getBadgeClass(
              game,
              viewMode
            )}`}
          >
            {getBadgeText(game, viewMode)}
          </span>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-[1fr_220px_1fr] items-center gap-6">
          <div className="flex min-w-0 items-center gap-4">
            <TeamLogoBadge teamName={game.home} sport={game.sport} size="lg" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-500">홈</div>
              <div className="truncate text-lg font-bold text-slate-900">
                {game.home}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center shadow-sm">
            {showScore ? (
              <div className="whitespace-nowrap text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                {game.score || "-"}
              </div>
            ) : (
              <div className="text-sm font-semibold text-slate-500">경기 일정</div>
            )}

            <div className="mt-3 rounded-xl bg-white px-3 py-3 text-base font-bold leading-tight text-slate-800 md:text-lg">
              {timeText}
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-4 text-right">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-500">원정</div>
              <div className="truncate text-lg font-bold text-slate-900">
                {game.away}
              </div>
            </div>
            <TeamLogoBadge teamName={game.away} sport={game.sport} size="lg" />
          </div>
        </div>

        {viewMode === "경기결과" &&
          game.sport === "축구" &&
          game.events &&
          game.events.length > 0 && (
            <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <div className="mb-2 text-sm font-bold text-emerald-900">
                주요 이벤트
              </div>
              <div className="flex flex-wrap gap-2">
                {game.events.map((event, index) => (
                  <span
                    key={`${event.player}-${event.time}-${index}`}
                    className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm"
                  >
                    {event.type === "goal"
                      ? "⚽"
                      : event.type === "yellow"
                      ? "🟨"
                      : "🟥"}{" "}
                    {event.player} {event.time}
                  </span>
                ))}
              </div>
            </div>
          )}

        <div className="mt-5 flex items-center justify-end">
          <button
            onClick={() => onOpen(game)}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            상세 보기
          </button>
        </div>
      </div>
    </div>
  );
}