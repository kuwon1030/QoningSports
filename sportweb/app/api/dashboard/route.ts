import { NextResponse } from "next/server";
import { BalldontlieAPI } from "@balldontlie/sdk";
import type { Game } from "@/types/game";

export const dynamic = "force-dynamic";
export const revalidate = 300;

const FOOTBALL_DATA_COMPETITIONS = [
  { code: "PL", label: "Premier League" },
  { code: "PD", label: "La Liga" },
  { code: "FL1", label: "Ligue 1" },
  { code: "SA", label: "Serie A" },
  { code: "BL1", label: "Bundesliga" },
  { code: "CL", label: "UEFA Champions League" },
] as const;

const NBA_EAST_TEAMS = new Set([
  "Atlanta Hawks",
  "Boston Celtics",
  "Brooklyn Nets",
  "Charlotte Hornets",
  "Chicago Bulls",
  "Cleveland Cavaliers",
  "Detroit Pistons",
  "Indiana Pacers",
  "Miami Heat",
  "Milwaukee Bucks",
  "New York Knicks",
  "Orlando Magic",
  "Philadelphia 76ers",
  "Toronto Raptors",
  "Washington Wizards",
]);

const NBA_WEST_TEAMS = new Set([
  "Dallas Mavericks",
  "Denver Nuggets",
  "Golden State Warriors",
  "Houston Rockets",
  "LA Clippers",
  "Los Angeles Lakers",
  "Memphis Grizzlies",
  "Minnesota Timberwolves",
  "New Orleans Pelicans",
  "Oklahoma City Thunder",
  "Phoenix Suns",
  "Portland Trail Blazers",
  "Sacramento Kings",
  "San Antonio Spurs",
  "Utah Jazz",
]);

const MLB_AL_TEAMS = new Set([
  "Baltimore Orioles",
  "Boston Red Sox",
  "New York Yankees",
  "Tampa Bay Rays",
  "Toronto Blue Jays",
  "Chicago White Sox",
  "Cleveland Guardians",
  "Detroit Tigers",
  "Kansas City Royals",
  "Minnesota Twins",
  "Houston Astros",
  "Los Angeles Angels",
  "Athletics",
  "Seattle Mariners",
  "Texas Rangers",
]);

const MLB_NL_TEAMS = new Set([
  "Atlanta Braves",
  "Miami Marlins",
  "New York Mets",
  "Philadelphia Phillies",
  "Washington Nationals",
  "Chicago Cubs",
  "Cincinnati Reds",
  "Milwaukee Brewers",
  "Pittsburgh Pirates",
  "St. Louis Cardinals",
  "Arizona Diamondbacks",
  "Colorado Rockies",
  "Los Angeles Dodgers",
  "San Diego Padres",
  "San Francisco Giants",
]);

function formatDateInSeoul(date: Date) {
  const seoul = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Seoul" })
  );

  const year = seoul.getFullYear();
  const month = String(seoul.getMonth() + 1).padStart(2, "0");
  const day = String(seoul.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

function getDateListInSeoul(pastDays = 7, futureDays = 14) {
  const now = new Date();
  const result: string[] = [];

  for (let i = -pastDays; i <= futureDays; i += 1) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    result.push(formatDateInSeoul(d));
  }

  return result;
}

function isFinishedStatus(raw?: string) {
  const value = String(raw ?? "").toLowerCase();
  return (
    value.includes("final") ||
    value.includes("finished") ||
    value.includes("completed") ||
    value.includes("ended") ||
    value === "ft" ||
    value === "aet" ||
    value === "pen"
  );
}

function isLiveStatus(raw?: string) {
  const value = String(raw ?? "").toLowerCase();
  return (
    value.includes("live") ||
    value.includes("1h") ||
    value.includes("2h") ||
    value.includes("et") ||
    value.includes("bt") ||
    value.includes("ht") ||
    value.includes("in_play") ||
    value.includes("q1") ||
    value.includes("q2") ||
    value.includes("q3") ||
    value.includes("q4") ||
    value.includes("ot")
  );
}

function getBallNames(game: any) {
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

  return { awayName, homeName };
}

function getBallScores(game: any) {
  const awayScore =
    game?.visitor_team_score ??
    game?.away_team_score ??
    game?.away_score ??
    null;

  const homeScore =
    game?.home_team_score ??
    game?.home_score ??
    null;

  return { awayScore, homeScore };
}

function deriveNbaLeague(home: string, away: string) {
  const east = NBA_EAST_TEAMS.has(home) && NBA_EAST_TEAMS.has(away);
  const west = NBA_WEST_TEAMS.has(home) && NBA_WEST_TEAMS.has(away);

  if (east) return "NBA · Eastern Conference";
  if (west) return "NBA · Western Conference";
  return "NBA";
}

function deriveMlbLeague(home: string, away: string) {
  const al = MLB_AL_TEAMS.has(home) && MLB_AL_TEAMS.has(away);
  const nl = MLB_NL_TEAMS.has(home) && MLB_NL_TEAMS.has(away);

  if (al) return "MLB · American League";
  if (nl) return "MLB · National League";
  return "MLB";
}

async function fetchSoccerGames(footballDataKey: string): Promise<Game[]> {
  const responses = await Promise.all(
    FOOTBALL_DATA_COMPETITIONS.map(async (competition) => {
      try {
        const response = await fetch(
          `https://api.football-data.org/v4/competitions/${competition.code}/matches`,
          {
            headers: {
              "X-Auth-Token": footballDataKey,
            },
            cache: "no-store",
          }
        );

        if (!response.ok) return [] as Game[];

        const json = await response.json();
        const matches = Array.isArray(json?.matches) ? json.matches : [];

        return matches.map((match: any): Game => {
          const status = String(match?.status ?? "");
          const finished =
            status === "FINISHED" ||
            status === "AWARDED" ||
            status === "CANCELLED";
          const live =
            status === "LIVE" ||
            status === "IN_PLAY" ||
            status === "PAUSED";

          return {
            id: Number(match?.id ?? Math.random()),
            sport: "축구",
            league: competition.label,
            status: live ? "LIVE" : "SCHEDULED",
            home: match?.homeTeam?.name ?? "Home",
            away: match?.awayTeam?.name ?? "Away",
            score:
              typeof match?.score?.fullTime?.home === "number" &&
              typeof match?.score?.fullTime?.away === "number"
                ? `${match.score.fullTime.home} - ${match.score.fullTime.away}`
                : undefined,
            timeLabel: live ? "LIVE" : formatKoreanDateTime(match?.utcDate),
            scheduledAt: match?.utcDate,
            isFinished: finished,
            events: [],
            homeLineup: [],
            awayLineup: [],
            homeFormation: "",
            awayFormation: "",
          };
        });
      } catch {
        return [] as Game[];
      }
    })
  );

  const merged = responses.flat();

  const now = Date.now();
  const minTime = now - 1000 * 60 * 60 * 24 * 14;
  const maxTime = now + 1000 * 60 * 60 * 24 * 30;

  const filtered = merged.filter((game) => {
    const t = new Date(game.scheduledAt ?? 0).getTime();
    return t >= minTime && t <= maxTime;
  });

  const unique = new Map<number, Game>();
  for (const game of filtered) unique.set(game.id, game);

  return Array.from(unique.values());
}

async function fetchBaseballGames(apiKey: string): Promise<Game[]> {
  const api = new BalldontlieAPI({ apiKey });
  const dates = getDateListInSeoul(3, 21);

  // 날짜를 한 번에 묶지 말고 하루씩 가져와서 합칩니다.
  const results = await Promise.all(
    dates.map(async (date) => {
      try {
        const response = await api.mlb.getGames({
          dates: [date],
          per_page: 100,
        });
        return Array.isArray(response?.data) ? response.data : [];
      } catch {
        return [];
      }
    })
  );

  const rawGames = results.flat();

  const unique = new Map<number, any>();
  for (const game of rawGames) {
    unique.set(Number(game?.id ?? Math.random()), game);
  }

  return Array.from(unique.values()).map((game: any): Game => {
    const { awayName, homeName } = getBallNames(game);
    const { awayScore, homeScore } = getBallScores(game);
    const finished = isFinishedStatus(game?.status);
    const live = !finished && isLiveStatus(game?.status);

    return {
      id: Number(game?.id ?? Math.random()),
      sport: "야구",
      league: deriveMlbLeague(homeName, awayName),
      status: live ? "LIVE" : "SCHEDULED",
      home: homeName,
      away: awayName,
      score:
        typeof awayScore === "number" && typeof homeScore === "number"
          ? `${awayScore} - ${homeScore}`
          : undefined,
      timeLabel: live
        ? String(game?.status ?? "LIVE")
        : formatKoreanDateTime(game?.date ?? game?.datetime ?? game?.scheduled_at),
      scheduledAt: game?.date ?? game?.datetime ?? game?.scheduled_at,
      isFinished: finished,
      startingPitchers: "",
      currentPitcher: "",
      pitchCount: undefined,
      batter: "",
      bases: [false, false, false],
      count: { ball: 0, strike: 0, out: 0 },
      batterRecords: [],
      pitcherRecords: [],
    };
  });
}

async function fetchBasketballGames(apiKey: string): Promise<Game[]> {
  const api = new BalldontlieAPI({ apiKey });
  const dates = getDateListInSeoul(7, 14);

  const results = await Promise.all(
    dates.map(async (date) => {
      try {
        const response = await api.nba.getGames({
          dates: [date],
          per_page: 100,
        });
        return Array.isArray(response?.data) ? response.data : [];
      } catch {
        return [];
      }
    })
  );

  const rawGames = results.flat();

  const unique = new Map<number, any>();
  for (const game of rawGames) {
    unique.set(Number(game?.id ?? Math.random()), game);
  }

  return Array.from(unique.values()).map((game: any): Game => {
    const { awayName, homeName } = getBallNames(game);
    const { awayScore, homeScore } = getBallScores(game);
    const finished = isFinishedStatus(game?.status);
    const live = !finished && isLiveStatus(game?.status);

    return {
      id: Number(game?.id ?? Math.random()),
      sport: "농구",
      league: deriveNbaLeague(homeName, awayName),
      status: live ? "LIVE" : "SCHEDULED",
      home: homeName,
      away: awayName,
      score:
        typeof awayScore === "number" && typeof homeScore === "number"
          ? `${awayScore} - ${homeScore}`
          : undefined,
      timeLabel: live
        ? String(game?.status ?? "LIVE")
        : formatKoreanDateTime(game?.date ?? game?.datetime ?? game?.scheduled_at),
      scheduledAt: game?.date ?? game?.datetime ?? game?.scheduled_at,
      isFinished: finished,
      lineup: [],
    };
  });
}

function sortGames(games: Game[]) {
  const leaguePriority = [
    "Premier League",
    "La Liga",
    "Ligue 1",
    "Serie A",
    "Bundesliga",
    "UEFA Champions League",
    "NBA · Eastern Conference",
    "NBA · Western Conference",
    "NBA",
    "MLB · American League",
    "MLB · National League",
    "MLB",
  ];

  return [...games].sort((a, b) => {
    const ai = leaguePriority.includes(a.league)
      ? leaguePriority.indexOf(a.league)
      : 999;
    const bi = leaguePriority.includes(b.league)
      ? leaguePriority.indexOf(b.league)
      : 999;

    if (ai !== bi) return ai - bi;

    const ta = new Date(a.scheduledAt ?? 0).getTime();
    const tb = new Date(b.scheduledAt ?? 0).getTime();
    return ta - tb;
  });
}

async function safeFetch(fn: () => Promise<Game[]>) {
  try {
    return await fn();
  } catch {
    return [];
  }
}

export async function GET() {
  const footballDataKey = process.env.FOOTBALL_DATA_API_KEY;
  const ballKey = process.env.BALLDONTLIE_API_KEY;

  try {
    const tasks: Promise<Game[]>[] = [];

    if (footballDataKey) {
      tasks.push(safeFetch(() => fetchSoccerGames(footballDataKey)));
    }

    if (ballKey) {
      tasks.push(safeFetch(() => fetchBaseballGames(ballKey)));
      tasks.push(safeFetch(() => fetchBasketballGames(ballKey)));
    }

    const results = await Promise.all(tasks);
    const games = sortGames(results.flat());

    return NextResponse.json({ games });
  } catch {
    return NextResponse.json({ games: [] }, { status: 200 });
  }
}