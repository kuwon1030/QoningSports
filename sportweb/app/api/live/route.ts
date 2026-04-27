import { NextResponse } from "next/server";
import { BalldontlieAPI } from "@balldontlie/sdk";
import type { Game } from "@/types/game";

export const dynamic = "force-dynamic";
export const revalidate = 60;

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

function getDateListInSeoul(pastDays = 1, futureDays = 1) {
  const now = new Date();
  const result: string[] = [];

  for (let i = -pastDays; i <= futureDays; i += 1) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);

    const seoul = new Date(
      d.toLocaleString("en-US", { timeZone: "Asia/Seoul" })
    );

    const year = seoul.getFullYear();
    const month = String(seoul.getMonth() + 1).padStart(2, "0");
    const day = String(seoul.getDate()).padStart(2, "0");

    result.push(`${year}-${month}-${day}`);
  }

  return result;
}

function isLiveFootballStatus(raw?: string) {
  const status = String(raw ?? "").toUpperCase();
  return status === "LIVE" || status === "IN_PLAY" || status === "PAUSED";
}

function isLiveBallStatus(raw?: string) {
  const status = String(raw ?? "").toLowerCase();

  return (
    status.includes("live") ||
    status.includes("in progress") ||
    status.includes("in_progress") ||
    status.includes("q1") ||
    status.includes("q2") ||
    status.includes("q3") ||
    status.includes("q4") ||
    status.includes("ot") ||
    status.includes("top") ||
    status.includes("bottom") ||
    status.includes("inning")
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

function normalizeFootballMatch(match: any, league: string): Game {
  const homeScore = match?.score?.fullTime?.home;
  const awayScore = match?.score?.fullTime?.away;

  return {
    id: Number(match?.id ?? Math.random()),
    sport: "축구",
    league,
    status: "LIVE",
    home: match?.homeTeam?.name ?? "Home",
    away: match?.awayTeam?.name ?? "Away",
    score:
      typeof homeScore === "number" && typeof awayScore === "number"
        ? `${homeScore} - ${awayScore}`
        : undefined,
    timeLabel: String(match?.status ?? "LIVE"),
    scheduledAt: match?.utcDate,
    isFinished: false,
    events: [],
    lineup: [],
    awayLineup: [],
    homeLineup: [],
    awayFormation: "",
    homeFormation: "",
  };
}

function normalizeBasketballMatch(game: any): Game {
  const { awayName, homeName } = getBallNames(game);
  const { awayScore, homeScore } = getBallScores(game);

  return {
    id: Number(game?.id ?? Math.random()),
    sport: "농구",
    league: deriveNbaLeague(homeName, awayName),
    status: "LIVE",
    home: homeName,
    away: awayName,
    score:
      typeof awayScore === "number" && typeof homeScore === "number"
        ? `${awayScore} - ${homeScore}`
        : undefined,
    timeLabel: String(game?.status ?? "LIVE"),
    scheduledAt: game?.date ?? game?.datetime ?? game?.scheduled_at,
    isFinished: false,
    lineup: [],
  };
}

function normalizeBaseballMatch(game: any): Game {
  const { awayName, homeName } = getBallNames(game);
  const { awayScore, homeScore } = getBallScores(game);

  return {
    id: Number(game?.id ?? Math.random()),
    sport: "야구",
    league: deriveMlbLeague(homeName, awayName),
    status: "LIVE",
    home: homeName,
    away: awayName,
    score:
      typeof awayScore === "number" && typeof homeScore === "number"
        ? `${awayScore} - ${homeScore}`
        : undefined,
    timeLabel: String(game?.status ?? "LIVE"),
    scheduledAt: game?.date ?? game?.datetime ?? game?.scheduled_at,
    isFinished: false,
    startingPitchers: "",
    currentPitcher: "",
    pitchCount: undefined,
    batter: "",
    bases: [false, false, false],
    count: { ball: 0, strike: 0, out: 0 },
    batterRecords: [],
    pitcherRecords: [],
  };
}

async function fetchFootballLiveGames(apiKey: string): Promise<Game[]> {
  const results = await Promise.all(
    FOOTBALL_DATA_COMPETITIONS.map(async (competition) => {
      try {
        const response = await fetch(
          `https://api.football-data.org/v4/competitions/${competition.code}/matches`,
          {
            headers: {
              "X-Auth-Token": apiKey,
            },
            cache: "no-store",
          }
        );

        if (!response.ok) {
          return [] as Game[];
        }

        const json = await response.json();
        const matches = Array.isArray(json?.matches) ? json.matches : [];

        return matches
          .filter((game: any) => isLiveFootballStatus(game?.status))
          .map((game: any) => normalizeFootballMatch(game, competition.label));
      } catch {
        return [] as Game[];
      }
    })
  );

  return results.flat();
}

async function fetchBasketballLiveGames(apiKey: string): Promise<Game[]> {
  const api = new BalldontlieAPI({ apiKey });
  const dates = getDateListInSeoul(1, 1);

  const results = await Promise.all(
    dates.map(async (date) => {
      try {
        const response = await api.nba.getGames({
          dates: [date],
          per_page: 100,
        });

        const games = Array.isArray(response?.data) ? response.data : [];

        return games
          .filter((game: any) => isLiveBallStatus(game?.status))
          .map((game: any) => normalizeBasketballMatch(game));
      } catch {
        return [] as Game[];
      }
    })
  );

  return results.flat();
}

async function fetchBaseballLiveGames(apiKey: string): Promise<Game[]> {
  const api = new BalldontlieAPI({ apiKey });
  const dates = getDateListInSeoul(1, 1);

  const results = await Promise.all(
    dates.map(async (date) => {
      try {
        const response = await api.mlb.getGames({
          dates: [date],
          per_page: 100,
        });

        const games = Array.isArray(response?.data) ? response.data : [];

        return games
          .filter((game: any) => isLiveBallStatus(game?.status))
          .map((game: any) => normalizeBaseballMatch(game));
      } catch {
        return [] as Game[];
      }
    })
  );

  return results.flat();
}

function sortGames(games: Game[]) {
  return [...games].sort((a, b) => {
    const ta = new Date(a.scheduledAt ?? 0).getTime();
    const tb = new Date(b.scheduledAt ?? 0).getTime();

    if (ta !== tb) return ta - tb;
    return a.league.localeCompare(b.league);
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
      tasks.push(safeFetch(() => fetchFootballLiveGames(footballDataKey)));
    }

    if (ballKey) {
      tasks.push(safeFetch(() => fetchBaseballLiveGames(ballKey)));
      tasks.push(safeFetch(() => fetchBasketballLiveGames(ballKey)));
    }

    const results = await Promise.all(tasks);
    const games = sortGames(results.flat());

    return NextResponse.json({ games });
  } catch {
    return NextResponse.json({ games: [] }, { status: 200 });
  }
}