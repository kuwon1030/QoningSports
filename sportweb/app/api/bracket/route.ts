import { NextRequest, NextResponse } from "next/server";
import { BalldontlieAPI } from "@balldontlie/sdk";

export const dynamic = "force-dynamic";
export const revalidate = 300;

type BracketMatchCard = {
  id: string;
  teamA: string;
  teamB: string;
  scoreText: string;
  timeText: string;
  detailText?: string;
};

type BracketColumn = {
  id: string;
  title: string;
  matches: BracketMatchCard[];
};

type FootballDataMatch = {
  id: number;
  utcDate?: string;
  status?: string;
  stage?: string;
  homeTeam?: { name?: string };
  awayTeam?: { name?: string };
  score?: {
    fullTime?: { home?: number | null; away?: number | null };
  };
};

type BallGame = {
  id: number;
  date?: string;
  datetime?: string;
  scheduled_at?: string;
  status?: string;
  postseason?: boolean;
  visitor_team?: { full_name?: string; city?: string; name?: string };
  home_team?: { full_name?: string; city?: string; name?: string };
  visitor_team_score?: number | null;
  home_team_score?: number | null;
};

const ROUND_OF_16_KEYS = ["LAST_16", "ROUND_OF_16"];

function getEuropeanSeasonYear(date = new Date()) {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return month >= 7 ? year : year - 1;
}

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

function getCompetitionLabel(code: string) {
  if (code === "CL") return "UEFA Champions League";
  if (code === "EL") return "UEFA Europa League";
  if (code === "FAC") return "FA Cup";
  return code;
}

function isFinishedFootball(match: FootballDataMatch) {
  const status = String(match?.status ?? "");
  return status === "FINISHED" || status === "AWARDED";
}

function aggregateFootballTie(stage: string, tieMatches: FootballDataMatch[]): BracketMatchCard {
  const sortedByDate = [...tieMatches].sort((a, b) => {
    const ta = new Date(a?.utcDate ?? 0).getTime();
    const tb = new Date(b?.utcDate ?? 0).getTime();
    return ta - tb;
  });

  const teamA = sortedByDate[0]?.homeTeam?.name ?? "TBD";
  const teamB = sortedByDate[0]?.awayTeam?.name ?? "TBD";

  let aggA = 0;
  let aggB = 0;
  let finishedLegs = 0;

  for (const match of sortedByDate) {
    const home = match?.homeTeam?.name ?? "";
    const away = match?.awayTeam?.name ?? "";
    const homeScore = match?.score?.fullTime?.home;
    const awayScore = match?.score?.fullTime?.away;

    if (
      isFinishedFootball(match) &&
      typeof homeScore === "number" &&
      typeof awayScore === "number"
    ) {
      finishedLegs += 1;

      if (home === teamA) aggA += homeScore;
      if (away === teamA) aggA += awayScore;

      if (home === teamB) aggB += homeScore;
      if (away === teamB) aggB += awayScore;
    }
  }

  const latest = sortedByDate[sortedByDate.length - 1];

  return {
    id: `${stage}-${sortedByDate.map((m) => m.id).join("-")}`,
    teamA,
    teamB,
    scoreText: finishedLegs > 0 ? `${aggA} - ${aggB}` : "-",
    timeText: formatKoreanDateTime(latest?.utcDate),
    detailText: sortedByDate.length > 1 ? `${sortedByDate.length}경기 합산` : "단판",
  };
}

function groupFootballStage(stageMatches: FootballDataMatch[], stage: string) {
  const tieMap = new Map<string, FootballDataMatch[]>();

  for (const match of stageMatches) {
    const home = match?.homeTeam?.name ?? "TBD";
    const away = match?.awayTeam?.name ?? "TBD";
    const ordered = [home, away].sort((a, b) => a.localeCompare(b));
    const key = `${ordered[0]}__${ordered[1]}`;

    if (!tieMap.has(key)) tieMap.set(key, []);
    tieMap.get(key)!.push(match);
  }

  return Array.from(tieMap.values()).map((tieMatches) =>
    aggregateFootballTie(stage, tieMatches)
  );
}

async function fetchCompetitionMatches(
  footballDataKey: string,
  tournament: string,
  season: number
) {
  const response = await fetch(
    `https://api.football-data.org/v4/competitions/${tournament}/matches?season=${season}`,
    {
      headers: {
        "X-Auth-Token": footballDataKey,
      },
      cache: "no-store",
    }
  );

  if (response.status === 403) {
    return { restricted: true, matches: [] as FootballDataMatch[] };
  }

  if (!response.ok) {
    throw new Error(`${tournament} 대진표 데이터를 불러오지 못했습니다. (${response.status})`);
  }

  const json = await response.json();

  return {
    restricted: false,
    matches: Array.isArray(json?.matches) ? (json.matches as FootballDataMatch[]) : [],
  };
}

async function getSoccerBracket(footballDataKey: string, tournament: string) {
  const currentSeason = getEuropeanSeasonYear(new Date());
  const candidateSeasons = [currentSeason, currentSeason - 1];

  let chosenMatches: FootballDataMatch[] = [];
  let restricted = false;

  for (const season of candidateSeasons) {
    const result = await fetchCompetitionMatches(footballDataKey, tournament, season);

    if (result.restricted) {
      restricted = true;
      break;
    }

    const knockoutMatches = result.matches.filter((match) => {
      const stage = String(match?.stage ?? "");
      return (
        ROUND_OF_16_KEYS.includes(stage) ||
        stage === "QUARTER_FINALS" ||
        stage === "SEMI_FINALS" ||
        stage === "FINAL"
      );
    });

    if (knockoutMatches.length > 0) {
      chosenMatches = knockoutMatches;
      break;
    }
  }

  if (restricted) {
    return {
      layout: "bracket",
      title: `${getCompetitionLabel(tournament)} 대진표`,
      columns: [] as BracketColumn[],
      emptyMessage: "현재 플랜에서 이 대회의 대진표 데이터 접근이 제한됩니다.",
    };
  }

  const stageMap = new Map<string, FootballDataMatch[]>();
  for (const match of chosenMatches) {
    const stage = String(match?.stage ?? "");
    if (!stageMap.has(stage)) stageMap.set(stage, []);
    stageMap.get(stage)!.push(match);
  }

  const stageGroups = [
    { keys: ROUND_OF_16_KEYS, id: "ROUND_OF_16", title: "16강" },
    { keys: ["QUARTER_FINALS"], id: "QUARTER_FINALS", title: "8강" },
    { keys: ["SEMI_FINALS"], id: "SEMI_FINALS", title: "4강" },
    { keys: ["FINAL"], id: "FINAL", title: "결승" },
  ];

  const columns: BracketColumn[] = stageGroups
    .map((group) => {
      const rawMatches = group.keys.flatMap((key) => stageMap.get(key) ?? []);
      const matches = groupFootballStage(rawMatches, group.id);

      if (matches.length === 0) return null;

      return {
        id: `${tournament}-${group.id}`,
        title: `${getCompetitionLabel(tournament)} · ${group.title}`,
        matches,
      };
    })
    .filter(Boolean) as BracketColumn[];

  return {
    layout: "bracket",
    title: `${getCompetitionLabel(tournament)} 대진표`,
    columns,
    emptyMessage:
      columns.length === 0 ? "표시할 대진표 데이터가 없습니다." : "",
  };
}

function getBallNames(game: BallGame) {
  const awayTeam = game?.visitor_team ?? {};
  const homeTeam = game?.home_team ?? {};

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

function isFinishedStatus(raw?: string) {
  const value = String(raw ?? "").toLowerCase();
  return (
    value.includes("final") ||
    value.includes("finished") ||
    value.includes("completed") ||
    value.includes("ended")
  );
}

function getDateListInSeoul(pastDays = 120, futureDays = 30) {
  const now = new Date();
  const result: string[] = [];

  for (let i = -pastDays; i <= futureDays; i += 1) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    result.push(formatDateInSeoul(d));
  }

  return result;
}

function groupBallSeries(games: BallGame[]) {
  const sorted = [...games].sort((a, b) => {
    const ta = new Date(a?.date ?? a?.datetime ?? a?.scheduled_at ?? 0).getTime();
    const tb = new Date(b?.date ?? b?.datetime ?? b?.scheduled_at ?? 0).getTime();
    return ta - tb;
  });

  const groups = new Map<string, BallGame[]>();

  for (const game of sorted) {
    const { awayName, homeName } = getBallNames(game);
    const key = [awayName, homeName].sort((a, b) => a.localeCompare(b)).join("__");

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(game);
  }

  return Array.from(groups.entries()).map(([key, items]) => ({
    key,
    games: items,
  }));
}

function buildSeriesCard(groupKey: string, games: BallGame[]): BracketMatchCard {
  const first = games[0];
  const { awayName, homeName } = getBallNames(first);

  let winsAway = 0;
  let winsHome = 0;

  for (const game of games) {
    const awayScore = game?.visitor_team_score;
    const homeScore = game?.home_team_score;

    if (
      isFinishedStatus(game?.status) &&
      typeof awayScore === "number" &&
      typeof homeScore === "number"
    ) {
      if (awayScore > homeScore) winsAway += 1;
      if (homeScore > awayScore) winsHome += 1;
    }
  }

  const latest = [...games].sort((a, b) => {
    const ta = new Date(a?.date ?? a?.datetime ?? a?.scheduled_at ?? 0).getTime();
    const tb = new Date(b?.date ?? b?.datetime ?? b?.scheduled_at ?? 0).getTime();
    return tb - ta;
  })[0];

  const latestAway = latest?.visitor_team_score;
  const latestHome = latest?.home_team_score;

  const latestScore =
    typeof latestAway === "number" && typeof latestHome === "number"
      ? `${latestAway} - ${latestHome}`
      : "-";

  return {
    id: groupKey,
    teamA: awayName,
    teamB: homeName,
    scoreText: `${winsAway} - ${winsHome}`,
    timeText: formatKoreanDateTime(
      latest?.date ?? latest?.datetime ?? latest?.scheduled_at
    ),
    detailText: `최근 경기 ${latestScore}`,
  };
}

async function getBasketballBracket(ballKey: string) {
  const api = new BalldontlieAPI({ apiKey: ballKey });
  const dates = getDateListInSeoul(120, 30);
  const response = await api.nba.getGames({ dates, per_page: 200 });
  const allGames = Array.isArray(response?.data) ? (response.data as BallGame[]) : [];

  const postseasonGames = allGames.filter((game) => game?.postseason === true);
  const targetGames = postseasonGames.length > 0 ? postseasonGames : allGames.slice(0, 40);

  const grouped = groupBallSeries(targetGames);
  const cards = grouped.map((group) => buildSeriesCard(group.key, group.games));

  const columns: BracketColumn[] = cards.length
    ? [
        {
          id: "nba-playoffs",
          title: "NBA 플레이오프 / 시리즈",
          matches: cards,
        },
      ]
    : [];

  return {
    layout: "nba-bracket",
    title: "NBA PLAYOFFS",
    columns,
    emptyMessage:
      columns.length === 0 ? "표시할 NBA 대진표 데이터가 없습니다." : "",
  };
}

export async function GET(request: NextRequest) {
  const sport = request.nextUrl.searchParams.get("sport") ?? "축구";
  const tournament = request.nextUrl.searchParams.get("tournament") ?? "CL";

  const footballDataKey = process.env.FOOTBALL_DATA_API_KEY;
  const ballKey = process.env.BALLDONTLIE_API_KEY;

  try {
    if (sport === "농구") {
      if (!ballKey) {
        return NextResponse.json(
          { error: "BALLDONTLIE_API_KEY가 설정되지 않았습니다." },
          { status: 500 }
        );
      }

      const data = await getBasketballBracket(ballKey);
      return NextResponse.json(data);
    }

    if (sport === "축구") {
      if (!footballDataKey) {
        return NextResponse.json(
          { error: "FOOTBALL_DATA_API_KEY가 설정되지 않았습니다." },
          { status: 500 }
        );
      }

      const data = await getSoccerBracket(footballDataKey, tournament);
      return NextResponse.json(data);
    }

    return NextResponse.json({
      layout: "",
      title: "",
      columns: [],
      emptyMessage: "현재 이 종목의 대진표 데이터는 준비 중입니다.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "대진표 데이터를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}