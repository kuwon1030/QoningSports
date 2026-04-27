import { NextResponse } from "next/server";
import { BalldontlieAPI } from "@balldontlie/sdk";
import type { Game } from "@/types/game";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FOOTBALL_CODES = ["PL", "PD", "SA", "BL1", "CL", "EL", "FAC"];
const FOOTBALL_LIVE_STATUSES = new Set(["LIVE", "IN_PLAY", "PAUSED"]);
const FOOTBALL_FINISHED_STATUSES = new Set(["FINISHED", "AWARDED"]);

function formatDateInSeoul(date: Date) {
  const seoul = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Seoul" })
  );

  const year = seoul.getFullYear();
  const month = String(seoul.getMonth() + 1).padStart(2, "0");
  const day = String(seoul.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayAndTomorrowInSeoul() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    today: formatDateInSeoul(now),
    tomorrow: formatDateInSeoul(tomorrow),
  };
}

function formatKoreanDateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(date);
}

function buildDisplayScore(away: unknown, home: unknown) {
  if (typeof away === "number" && typeof home === "number") {
    return `${away} - ${home}`;
  }
  return "-";
}

function normalizeFootballMatch(match: any): Game {
  const homeScore =
    match?.score?.fullTime?.home ??
    match?.score?.regularTime?.home ??
    match?.score?.fullTime?.homeTeam ??
    null;

  const awayScore =
    match?.score?.fullTime?.away ??
    match?.score?.regularTime?.away ??
    match?.score?.fullTime?.awayTeam ??
    null;

  const rawStatus = String(match?.status ?? "");
  const isLive = FOOTBALL_LIVE_STATUSES.has(rawStatus);
  const isFinished = FOOTBALL_FINISHED_STATUSES.has(rawStatus);

  return {
    id: Number(match?.id ?? Math.random()),
    sport: "축구",
    league: match?.competition?.name ?? "축구",
    status: isLive ? "LIVE" : "SCHEDULED",
    home: match?.homeTeam?.name ?? "Home",
    away: match?.awayTeam?.name ?? "Away",
    score: buildDisplayScore(awayScore, homeScore),
    timeLabel: isLive ? "LIVE" : formatKoreanDateTime(match?.utcDate),
    scheduledAt: match?.utcDate ?? undefined,
    isFinished,
  };
}

function inferBallFinished(game: any) {
  const rawStatus = String(game?.status ?? "").toLowerCase();

  return (
    rawStatus.includes("final") ||
    rawStatus.includes("finished") ||
    rawStatus.includes("completed") ||
    rawStatus.includes("ended")
  );
}

function inferBallLive(game: any) {
  const rawStatus = String(game?.status ?? "").toLowerCase();

  return (
    rawStatus.includes("live") ||
    rawStatus.includes("progress") ||
    rawStatus.includes("quarter") ||
    rawStatus.includes("q") ||
    rawStatus.includes("period") ||
    rawStatus.includes("inning") ||
    rawStatus.includes("half")
  );
}

function normalizeBallGame(
  game: any,
  sport: Game["sport"],
  fallbackLeague: string
): Game {
  const awayTeam =
    game?.visitor_team ?? game?.away_team ?? game?.awayTeam ?? {};
  const homeTeam =
    game?.home_team ?? game?.homeTeam ?? game?.homeTeamData ?? {};

  const awayName =
    awayTeam?.full_name ??
    [awayTeam?.city, awayTeam?.name].filter(Boolean).join(" ") ??
    awayTeam?.name ??
    "Away";

  const homeName =
    homeTeam?.full_name ??
    [homeTeam?.city, homeTeam?.name].filter(Boolean).join(" ") ??
    homeTeam?.name ??
    "Home";

  const awayScore =
    game?.visitor_team_score ??
    game?.away_team_score ??
    game?.away_score ??
    null;

  const homeScore =
    game?.home_team_score ??
    game?.home_score ??
    null;

  const isLive = inferBallLive(game);
  const isFinished = inferBallFinished(game);

  return {
    id: Number(game?.id ?? Math.random()),
    sport,
    league: fallbackLeague,
    status: isLive ? "LIVE" : "SCHEDULED",
    home: homeName,
    away: awayName,
    score: buildDisplayScore(awayScore, homeScore),
    timeLabel: isLive
      ? String(game?.status ?? "LIVE")
      : formatKoreanDateTime(game?.date ?? game?.datetime ?? game?.scheduled_at),
    scheduledAt: game?.date ?? game?.datetime ?? game?.scheduled_at ?? undefined,
    isFinished,
  };
}

async function fetchFootballLive(apiKey: string) {
  const { today, tomorrow } = getTodayAndTomorrowInSeoul();

  const requests = FOOTBALL_CODES.map(async (code) => {
    const url = `https://api.football-data.org/v4/competitions/${code}/matches?dateFrom=${today}&dateTo=${tomorrow}`;

    const response = await fetch(url, {
      headers: {
        "X-Auth-Token": apiKey,
      },
      cache: "no-store",
    });

    if (!response.ok) return [];

    const json = await response.json();
    const matches = Array.isArray(json?.matches) ? json.matches : [];

    return matches
      .map(normalizeFootballMatch)
      .filter((game) => game.status === "LIVE");
  });

  const results = await Promise.all(requests);
  return results.flat();
}

async function fetchBallLive(apiKey: string) {
  const api = new BalldontlieAPI({ apiKey });
  const { today, tomorrow } = getTodayAndTomorrowInSeoul();
  const dates = [today, tomorrow];

  const [nba, nfl, mlb] = await Promise.allSettled([
    api.nba.getGames({ dates, per_page: 100 }),
    api.nfl.getGames({ dates, per_page: 100 }),
    api.mlb.getGames({ dates, per_page: 100 }),
  ]);

  const nbaGames =
    nba.status === "fulfilled"
      ? (nba.value?.data ?? [])
          .map((game: any) => normalizeBallGame(game, "농구", "NBA"))
          .filter((game: Game) => game.status === "LIVE")
      : [];

  const nflGames =
    nfl.status === "fulfilled"
      ? (nfl.value?.data ?? [])
          .map((game: any) => normalizeBallGame(game, "미식축구", "NFL"))
          .filter((game: Game) => game.status === "LIVE")
      : [];

  const mlbGames =
    mlb.status === "fulfilled"
      ? (mlb.value?.data ?? [])
          .map((game: any) => normalizeBallGame(game, "야구", "MLB"))
          .filter((game: Game) => game.status === "LIVE")
      : [];

  return [...nbaGames, ...nflGames, ...mlbGames];
}

export async function GET() {
  const footballKey = process.env.FOOTBALL_DATA_API_KEY;
  const ballKey = process.env.BALLDONTLIE_API_KEY;

  if (!footballKey || !ballKey) {
    return NextResponse.json(
      {
        games: [],
        error:
          "FOOTBALL_DATA_API_KEY 또는 BALLDONTLIE_API_KEY가 설정되지 않았습니다.",
      },
      { status: 500 }
    );
  }

  try {
    const [footballGames, ballGames] = await Promise.all([
      fetchFootballLive(footballKey),
      fetchBallLive(ballKey),
    ]);

    return NextResponse.json({
      games: [...footballGames, ...ballGames],
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        games: [],
        error: "라이브 데이터를 불러오지 못했습니다.",
      },
      { status: 500 }
    );
  }
}