"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BracketView from "@/components/BracketView";
import GameCard from "@/components/GameCard";
import GameDetailModal from "@/components/GameDetailModal";
import SearchBar from "@/components/SearchBar";
import SportTabs from "@/components/SportTabs";
import TeamLogoBadge from "@/components/TeamLogoBadge";
import { Game, SportType } from "@/types/game";

type StandingsRow = {
  position: number;
  team: string;
  playedGames: number;
  points: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

type ViewMode = "예정경기" | "경기결과" | "순위" | "대진표";
type SoccerTournament = "CL" | "EL" | "FAC";

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

const STANDINGS_LEAGUES = [
  { code: "PL", label: "Premier League" },
  { code: "PD", label: "La Liga" },
  { code: "FL1", label: "Ligue 1" },
  { code: "SA", label: "Serie A" },
  { code: "BL1", label: "Bundesliga" },
];

const SOCCER_TOURNAMENTS: { code: SoccerTournament; label: string }[] = [
  { code: "CL", label: "챔피언스리그" },
  { code: "EL", label: "유로파리그" },
  { code: "FAC", label: "FA컵" },
];

const SOCCER_ORDER = [
  "Premier League",
  "La Liga",
  "Ligue 1",
  "Serie A",
  "Bundesliga",
  "UEFA Champions League",
  "UEFA Europa League",
  "FA Cup",
];

function getStorageKey(type: "teams" | "leagues") {
  return `sports-app-favorites-${type}`;
}

function toTimeValue(value?: string) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function gameKey(game: Game) {
  return `${game.sport}-${game.id}`;
}

function sortLeaguesForSport(sport: SportType, leagues: string[]) {
  if (sport === "축구") {
    return [...leagues].sort((a, b) => {
      const ai = SOCCER_ORDER.indexOf(a);
      const bi = SOCCER_ORDER.indexOf(b);

      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
  }

  if (sport === "야구") {
    return [...leagues].sort((a, b) => {
      if (a.includes("American") && !b.includes("American")) return -1;
      if (!a.includes("American") && b.includes("American")) return 1;
      return a.localeCompare(b);
    });
  }

  if (sport === "농구") {
    return [...leagues].sort((a, b) => {
      if (a.includes("Eastern") && !b.includes("Eastern")) return -1;
      if (!a.includes("Eastern") && b.includes("Eastern")) return 1;
      return a.localeCompare(b);
    });
  }

  return [...leagues].sort();
}

function getLeagueGroups(sport: SportType, leagues: string[]) {
  const sorted = sortLeaguesForSport(sport, leagues);

  if (sport === "축구") return [{ title: "유럽 리그 / 컵", items: sorted }];
  if (sport === "야구") return [{ title: "MLB", items: sorted }];
  if (sport === "농구") return [{ title: "NBA", items: sorted }];
  return [{ title: "NFL", items: sorted }];
}

function getTeamGroupLabel(sport: SportType, relatedLeague?: string) {
  if (sport === "축구") return relatedLeague ?? "축구";
  if (sport === "야구") {
    if (relatedLeague?.includes("American")) return "American League";
    if (relatedLeague?.includes("National")) return "National League";
    return "MLB";
  }
  if (sport === "농구") {
    if (relatedLeague?.includes("Eastern")) return "Eastern Conference";
    if (relatedLeague?.includes("Western")) return "Western Conference";
    return "NBA";
  }
  return "NFL";
}

export default function Home() {
  const [selectedSport, setSelectedSport] = useState<SportType>("축구");
  const [viewMode, setViewMode] = useState<ViewMode>("예정경기");
  const [selectedTournament, setSelectedTournament] =
    useState<SoccerTournament>("CL");
  const [selectedLeagueFilter, setSelectedLeagueFilter] = useState("전체");
  const [search, setSearch] = useState("");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);

  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [favoriteLeagues, setFavoriteLeagues] = useState<string[]>([]);

  const [selectedStandingsCode, setSelectedStandingsCode] = useState("PL");
  const [standingsRows, setStandingsRows] = useState<StandingsRow[]>([]);
  const [standingsCompetitionName, setStandingsCompetitionName] = useState("");
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [standingsError, setStandingsError] = useState("");

  const [bracketLoading, setBracketLoading] = useState(false);
  const [bracketError, setBracketError] = useState("");
  const [bracketLayout, setBracketLayout] = useState<
    "bracket" | "nba-bracket" | ""
  >("");
  const [bracketTitle, setBracketTitle] = useState("");
  const [bracketColumns, setBracketColumns] = useState<BracketColumn[]>([]);
  const [bracketEmptyMessage, setBracketEmptyMessage] = useState("");

  const livePollRef = useRef<NodeJS.Timeout | null>(null);
  const bracketCacheRef = useRef<
    Record<
      string,
      {
        layout: "bracket" | "nba-bracket" | "";
        title: string;
        columns: BracketColumn[];
        emptyMessage: string;
      } | undefined
    >
  >({});

  useEffect(() => {
    try {
      const savedTeams = localStorage.getItem(getStorageKey("teams"));
      const savedLeagues = localStorage.getItem(getStorageKey("leagues"));

      if (savedTeams) setFavoriteTeams(JSON.parse(savedTeams));
      if (savedLeagues) setFavoriteLeagues(JSON.parse(savedLeagues));
    } catch {
      setFavoriteTeams([]);
      setFavoriteLeagues([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(getStorageKey("teams"), JSON.stringify(favoriteTeams));
  }, [favoriteTeams]);

  useEffect(() => {
    localStorage.setItem(getStorageKey("leagues"), JSON.stringify(favoriteLeagues));
  }, [favoriteLeagues]);

  async function loadDashboard(showLoading = false) {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);

      setError("");

      const response = await fetch("/api/dashboard", {
        cache: "no-store",
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error ?? "데이터를 불러오지 못했습니다.");
      }

      setGames(Array.isArray(json?.games) ? json.games : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      if (showLoading) setLoading(false);
      else setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard(true);
  }, []);

  const sportGames = useMemo(
    () => games.filter((game) => game.sport === selectedSport),
    [games, selectedSport]
  );

  const availableLeagues = useMemo(() => {
    const leagues = Array.from(new Set(sportGames.map((game) => game.league)));
    return sortLeaguesForSport(selectedSport, leagues);
  }, [sportGames, selectedSport]);

  useEffect(() => {
    setSelectedLeagueFilter("전체");
  }, [selectedSport]);

  useEffect(() => {
    if (selectedSport !== "축구" && viewMode === "순위") {
      setViewMode("예정경기");
    }
  }, [selectedSport, viewMode]);

  const liveGamesInSelectedSport = useMemo(() => {
    return sportGames.filter((game) => game.status === "LIVE");
  }, [sportGames]);

  useEffect(() => {
    if (livePollRef.current) {
      clearInterval(livePollRef.current);
      livePollRef.current = null;
    }

    const shouldPollLive =
      viewMode === "경기결과" && liveGamesInSelectedSport.length > 0;

    if (!shouldPollLive) return;

    const pollLive = async () => {
      try {
        const response = await fetch("/api/live", { cache: "no-store" });
        const json = await response.json();
        if (!response.ok) return;

        const liveUpdates: Game[] = Array.isArray(json?.games) ? json.games : [];

        setGames((prev) => {
          const liveMap = new Map(liveUpdates.map((game) => [gameKey(game), game]));
          return prev.map((game) => {
            const key = gameKey(game);
            return liveMap.has(key) ? liveMap.get(key)! : game;
          });
        });
      } catch {
        // ignore
      }
    };

    livePollRef.current = setInterval(pollLive, 20000);

    return () => {
      if (livePollRef.current) clearInterval(livePollRef.current);
      livePollRef.current = null;
    };
  }, [viewMode, liveGamesInSelectedSport.length]);

  useEffect(() => {
    if (!(selectedSport === "축구" && viewMode === "순위")) return;

    let cancelled = false;

    async function loadStandings() {
      try {
        setStandingsLoading(true);
        setStandingsError("");

        const response = await fetch(
          `/api/standings?code=${encodeURIComponent(selectedStandingsCode)}`,
          { cache: "no-store" }
        );

        const json = await response.json();

        if (!response.ok) {
          throw new Error(json?.error ?? "순위 데이터를 불러오지 못했습니다.");
        }

        if (!cancelled) {
          setStandingsRows(Array.isArray(json?.rows) ? json.rows : []);
          setStandingsCompetitionName(json?.competitionName ?? "");
        }
      } catch (err) {
        if (!cancelled) {
          setStandingsRows([]);
          setStandingsCompetitionName("");
          setStandingsError(
            err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
          );
        }
      } finally {
        if (!cancelled) setStandingsLoading(false);
      }
    }

    loadStandings();

    return () => {
      cancelled = true;
    };
  }, [selectedSport, viewMode, selectedStandingsCode]);

  useEffect(() => {
    if (viewMode !== "대진표") return;

    const cacheKey =
      selectedSport === "축구"
        ? `${selectedSport}-${selectedTournament}`
        : selectedSport;

    const cached = bracketCacheRef.current[cacheKey];
    if (cached) {
      setBracketLayout(cached.layout);
      setBracketTitle(cached.title);
      setBracketColumns(cached.columns);
      setBracketEmptyMessage(cached.emptyMessage);
      setBracketError("");
      setBracketLoading(false);
      return;
    }

    let cancelled = false;

    async function loadBracket() {
      try {
        setBracketLoading(true);
        setBracketError("");
        setBracketLayout("");
        setBracketTitle("");
        setBracketColumns([]);
        setBracketEmptyMessage("");

        const url =
          selectedSport === "축구"
            ? `/api/bracket?sport=${encodeURIComponent(
                selectedSport
              )}&tournament=${encodeURIComponent(selectedTournament)}`
            : `/api/bracket?sport=${encodeURIComponent(selectedSport)}`;

        const response = await fetch(url, { cache: "no-store" });
        const json = await response.json();

        if (!response.ok) {
          throw new Error(json?.error ?? "대진표 데이터를 불러오지 못했습니다.");
        }

        const nextValue = {
          layout: (json?.layout ?? "") as "bracket" | "nba-bracket" | "",
          title: json?.title ?? "",
          columns: Array.isArray(json?.columns) ? json.columns : [],
          emptyMessage: json?.emptyMessage ?? "",
        };

        bracketCacheRef.current[cacheKey] = nextValue;

        if (!cancelled) {
          setBracketLayout(nextValue.layout);
          setBracketTitle(nextValue.title);
          setBracketColumns(nextValue.columns);
          setBracketEmptyMessage(nextValue.emptyMessage);
        }
      } catch (err) {
        if (!cancelled) {
          setBracketError(
            err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
          );
        }
      } finally {
        if (!cancelled) setBracketLoading(false);
      }
    }

    loadBracket();

    return () => {
      cancelled = true;
    };
  }, [viewMode, selectedSport, selectedTournament]);

  const filteredByLeague = useMemo(() => {
    if (selectedLeagueFilter === "전체") return sportGames;
    return sportGames.filter((game) => game.league === selectedLeagueFilter);
  }, [sportGames, selectedLeagueFilter]);

  const searchedGames = useMemo(() => {
    return filteredByLeague.filter((game) => {
      const keyword = `${game.home} ${game.away} ${game.league}`.toLowerCase();
      return keyword.includes(search.toLowerCase());
    });
  }, [filteredByLeague, search]);

  const modeFilteredGames = useMemo(() => {
    if (viewMode === "대진표" || viewMode === "순위") return [];
    return searchedGames.filter((game) =>
      viewMode === "예정경기" ? !game.isFinished : !!game.isFinished
    );
  }, [searchedGames, viewMode]);

  const favoriteGames = useMemo(() => {
    return modeFilteredGames.filter((game) => {
      const isFavoriteTeam =
        favoriteTeams.includes(game.home) || favoriteTeams.includes(game.away);
      const isFavoriteLeague = favoriteLeagues.includes(game.league);
      return isFavoriteTeam || isFavoriteLeague;
    });
  }, [modeFilteredGames, favoriteTeams, favoriteLeagues]);

  const otherGames = useMemo(() => {
    return modeFilteredGames.filter((game) => {
      const isFavoriteTeam =
        favoriteTeams.includes(game.home) || favoriteTeams.includes(game.away);
      const isFavoriteLeague = favoriteLeagues.includes(game.league);
      return !(isFavoriteTeam || isFavoriteLeague);
    });
  }, [modeFilteredGames, favoriteTeams, favoriteLeagues]);

  const sortedFavoriteGames = useMemo(() => {
    return [...favoriteGames].sort((a, b) => {
      const aFavTeam =
        favoriteTeams.includes(a.home) || favoriteTeams.includes(a.away);
      const bFavTeam =
        favoriteTeams.includes(b.home) || favoriteTeams.includes(b.away);

      if (aFavTeam !== bFavTeam) return aFavTeam ? -1 : 1;

      if (viewMode === "예정경기") {
        return toTimeValue(a.scheduledAt) - toTimeValue(b.scheduledAt);
      }

      return toTimeValue(b.scheduledAt) - toTimeValue(a.scheduledAt);
    });
  }, [favoriteGames, favoriteTeams, viewMode]);

  const sortedOtherGames = useMemo(() => {
    return [...otherGames].sort((a, b) => {
      if (viewMode === "예정경기") {
        return toTimeValue(a.scheduledAt) - toTimeValue(b.scheduledAt);
      }

      return toTimeValue(b.scheduledAt) - toTimeValue(a.scheduledAt);
    });
  }, [otherGames, viewMode]);

  const availableTeams = useMemo(() => {
    return Array.from(
      new Set(
        sportGames.flatMap((game) => [game.home, game.away]).filter(Boolean)
      )
    ).sort();
  }, [sportGames]);

  const groupedLeagueOptions = getLeagueGroups(selectedSport, availableLeagues);

  const groupedTeamOptions = useMemo(() => {
    const teamLeague = new Map<string, string>();

    sportGames.forEach((game) => {
      if (!teamLeague.has(game.home)) teamLeague.set(game.home, game.league);
      if (!teamLeague.has(game.away)) teamLeague.set(game.away, game.league);
    });

    const grouped = new Map<string, string[]>();

    availableTeams.forEach((team) => {
      const label = getTeamGroupLabel(selectedSport, teamLeague.get(team));
      if (!grouped.has(label)) grouped.set(label, []);
      grouped.get(label)!.push(team);
    });

    const items = Array.from(grouped.entries()).map(([title, items]) => ({
      title,
      items: items.sort(),
    }));

    return items.sort((a, b) => a.title.localeCompare(b.title));
  }, [availableTeams, selectedSport, sportGames]);

  const favoriteSummaryGroups = useMemo(() => {
    const teamLeague = new Map<string, string>();

    games.forEach((game) => {
      if (!teamLeague.has(game.home)) teamLeague.set(game.home, game.league);
      if (!teamLeague.has(game.away)) teamLeague.set(game.away, game.league);
    });

    const leagueGroups =
      favoriteLeagues.length > 0 ? getLeagueGroups(selectedSport, favoriteLeagues) : [];
    const teamGrouped = new Map<string, string[]>();

    favoriteTeams.forEach((team) => {
      const label = getTeamGroupLabel(selectedSport, teamLeague.get(team));
      if (!teamGrouped.has(label)) teamGrouped.set(label, []);
      teamGrouped.get(label)!.push(team);
    });

    const teamGroups = Array.from(teamGrouped.entries()).map(([title, items]) => ({
      title,
      items: items.sort(),
    }));

    return { leagueGroups, teamGroups };
  }, [favoriteLeagues, favoriteTeams, games, selectedSport]);

  function toggleFavoriteTeam(team: string) {
    setFavoriteTeams((prev) =>
      prev.includes(team) ? prev.filter((item) => item !== team) : [...prev, team]
    );
  }

  function toggleFavoriteLeague(league: string) {
    setFavoriteLeagues((prev) =>
      prev.includes(league)
        ? prev.filter((item) => item !== league)
        : [...prev, league]
    );
  }

  function clearFavorites() {
    setFavoriteTeams([]);
    setFavoriteLeagues([]);
  }

  const viewModes =
    selectedSport === "축구"
      ? (["예정경기", "경기결과", "순위", "대진표"] as ViewMode[])
      : (["예정경기", "경기결과", "대진표"] as ViewMode[]);

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-8">
      <div className="mb-6 overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-6 py-8 text-white">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/90">
                MATCH CENTER
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight">매치 센터</h1>
              <p className="mt-2 text-sm text-white/80">
                유럽 축구 중심으로 주요 종목 경기 일정, 결과, 대진표를 한 화면에서 확인합니다.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/80">
                <span>현재 선택 종목 라이브 경기: {liveGamesInSelectedSport.length}개</span>
                {viewMode === "경기결과" && liveGamesInSelectedSport.length > 0 ? (
                  <span className="text-emerald-300">
                    라이브 경기만 20초 간격으로 자동 갱신 중
                  </span>
                ) : (
                  <span>자동 갱신 꺼짐</span>
                )}
                {refreshing && <span>데이터 갱신 중...</span>}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => loadDashboard(false)}
                className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white"
              >
                데이터 새로고침
              </button>

              <button
                onClick={() => setMenuOpen(true)}
                className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-slate-900"
              >
                즐겨찾기 설정
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SportTabs
          selectedSport={selectedSport}
          setSelectedSport={setSelectedSport}
        />
        {(viewMode === "예정경기" || viewMode === "경기결과") && (
          <SearchBar search={search} setSearch={setSearch} />
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {viewModes.map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
              viewMode === mode
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-800 shadow-sm"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {(viewMode === "예정경기" || viewMode === "경기결과") && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedLeagueFilter("전체")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
              selectedLeagueFilter === "전체"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-800 shadow-sm"
            }`}
          >
            전체
          </button>

          {availableLeagues.map((league) => (
            <button
              key={league}
              onClick={() => setSelectedLeagueFilter(league)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                selectedLeagueFilter === league
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-800 shadow-sm"
              }`}
            >
              {league}
            </button>
          ))}
        </div>
      )}

      {viewMode === "대진표" && selectedSport === "축구" && (
        <div className="mb-6 flex flex-wrap gap-2">
          {SOCCER_TOURNAMENTS.map((tournament) => (
            <button
              key={tournament.code}
              onClick={() => setSelectedTournament(tournament.code)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                selectedTournament === tournament.code
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-800 shadow-sm"
              }`}
            >
              {tournament.label}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="text-slate-700">실데이터를 불러오는 중입니다...</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-red-600">{error}</p>
        </div>
      )}

      {!loading && !error && viewMode === "순위" && selectedSport === "축구" && (
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap gap-2">
            {STANDINGS_LEAGUES.map((league) => (
              <button
                key={league.code}
                onClick={() => setSelectedStandingsCode(league.code)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  selectedStandingsCode === league.code
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-900"
                }`}
              >
                {league.label}
              </button>
            ))}
          </div>

          {standingsLoading && (
            <div className="rounded-2xl bg-slate-50 p-8 text-center">
              <p className="text-slate-700">순위 데이터를 불러오는 중입니다...</p>
            </div>
          )}

          {!standingsLoading && standingsError && (
            <div className="rounded-2xl bg-slate-50 p-8 text-center">
              <p className="font-semibold text-red-600">{standingsError}</p>
            </div>
          )}

          {!standingsLoading && !standingsError && (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-900">
                {standingsCompetitionName || "리그 순위"}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="bg-slate-200 text-slate-900">
                    <tr>
                      <th className="px-3 py-3 text-center">순위</th>
                      <th className="px-3 py-3 text-left">팀</th>
                      <th className="px-3 py-3 text-center">경기수</th>
                      <th className="px-3 py-3 text-center">승점</th>
                      <th className="px-3 py-3 text-center">승</th>
                      <th className="px-3 py-3 text-center">무</th>
                      <th className="px-3 py-3 text-center">패</th>
                      <th className="px-3 py-3 text-center">득실</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standingsRows.map((row) => (
                      <tr key={row.team} className="border-t border-slate-200 bg-white">
                        <td className="px-3 py-3 text-center font-semibold text-slate-900">
                          {row.position}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <TeamLogoBadge teamName={row.team} sport="축구" size="sm" />
                            <span className="font-semibold text-slate-900">{row.team}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center text-slate-800">{row.playedGames}</td>
                        <td className="px-3 py-3 text-center font-bold text-slate-900">{row.points}</td>
                        <td className="px-3 py-3 text-center text-slate-800">{row.won}</td>
                        <td className="px-3 py-3 text-center text-slate-800">{row.draw}</td>
                        <td className="px-3 py-3 text-center text-slate-800">{row.lost}</td>
                        <td className="px-3 py-3 text-center text-slate-800">
                          {row.goalsFor}-{row.goalsAgainst} ({row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference})
                        </td>
                      </tr>
                    ))}

                    {standingsRows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                          표시할 순위 데이터가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {!loading && !error && (viewMode === "예정경기" || viewMode === "경기결과") && (
        <div className="space-y-8">
          {sortedFavoriteGames.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  즐겨찾기 {viewMode}
                </h2>
                <span className="text-sm text-slate-600">{sortedFavoriteGames.length}개</span>
              </div>

              <div className="space-y-4">
                {sortedFavoriteGames.map((game) => (
                  <GameCard
                    key={`favorite-${game.sport}-${game.id}`}
                    game={game}
                    onOpen={(selected) => setSelectedGame(selected)}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">전체 {viewMode}</h2>
              <span className="text-sm text-slate-600">{sortedOtherGames.length}개</span>
            </div>

            <div className="space-y-4">
              {sortedOtherGames.map((game) => (
                <GameCard
                  key={`${game.sport}-${game.id}`}
                  game={game}
                  onOpen={(selected) => setSelectedGame(selected)}
                  viewMode={viewMode}
                />
              ))}
            </div>

            {sortedFavoriteGames.length === 0 && sortedOtherGames.length === 0 && (
              <div className="mt-6 rounded-3xl bg-white p-8 text-center shadow-sm">
                <p className="text-slate-600">조건에 맞는 경기가 없습니다.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {!loading && !error && viewMode === "대진표" && (
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">대진표</h2>
            <p className="mt-1 text-sm text-slate-600">
              {selectedSport} 기준 토너먼트 / 시리즈 / 시즌 정보입니다.
            </p>
          </div>

          <BracketView
            sport={selectedSport}
            layout={bracketLayout}
            title={bracketTitle}
            columns={bracketColumns}
            loading={bracketLoading}
            error={bracketError}
            emptyMessage={bracketEmptyMessage}
          />
        </section>
      )}

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-full max-w-md overflow-auto bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">즐겨찾기 설정</h2>
              <button
                onClick={() => setMenuOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-800"
              >
                닫기
              </button>
            </div>

            {(favoriteLeagues.length > 0 || favoriteTeams.length > 0) && (
              <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">현재 즐겨찾기</h3>
                  <button
                    onClick={clearFavorites}
                    className="text-sm font-semibold text-red-600"
                  >
                    전체 해제
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="mb-2 text-sm font-semibold text-slate-700">즐겨찾기 리그</div>
                    {favoriteSummaryGroups.leagueGroups.length > 0 ? (
                      <div className="space-y-3">
                        {favoriteSummaryGroups.leagueGroups.map((group) => (
                          <div key={group.title}>
                            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                              {group.title}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {group.items.map((league) => (
                                <span
                                  key={league}
                                  className="rounded-full bg-white px-3 py-1 text-sm text-slate-800 shadow-sm"
                                >
                                  {league}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">선택 없음</div>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-semibold text-slate-700">즐겨찾기 팀</div>
                    {favoriteSummaryGroups.teamGroups.length > 0 ? (
                      <div className="space-y-3">
                        {favoriteSummaryGroups.teamGroups.map((group) => (
                          <div key={group.title}>
                            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                              {group.title}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {group.items.map((team) => (
                                <span
                                  key={team}
                                  className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm text-slate-800 shadow-sm"
                                >
                                  <TeamLogoBadge teamName={team} sport={selectedSport} size="xs" />
                                  {team}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">선택 없음</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mb-8">
              <h3 className="mb-3 text-base font-bold text-slate-900">리그 즐겨찾기</h3>

              <div className="space-y-4">
                {groupedLeagueOptions.map((group) => (
                  <div key={group.title}>
                    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                      {group.title}
                    </div>
                    <div className="space-y-2">
                      {group.items.length > 0 ? (
                        group.items.map((league) => (
                          <label
                            key={league}
                            className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-slate-900"
                          >
                            <input
                              type="checkbox"
                              checked={favoriteLeagues.includes(league)}
                              onChange={() => toggleFavoriteLeague(league)}
                            />
                            <span className="text-sm">{league}</span>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">선택 가능한 리그 없음</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-base font-bold text-slate-900">팀 즐겨찾기</h3>

              <div className="space-y-4">
                {groupedTeamOptions.map((group) => (
                  <div key={group.title}>
                    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                      {group.title}
                    </div>

                    <div className="space-y-2">
                      {group.items.length > 0 ? (
                        group.items.map((team) => (
                          <label
                            key={team}
                            className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-slate-900"
                          >
                            <input
                              type="checkbox"
                              checked={favoriteTeams.includes(team)}
                              onChange={() => toggleFavoriteTeam(team)}
                            />
                            <TeamLogoBadge teamName={team} sport={selectedSport} size="xs" />
                            <span className="text-sm">{team}</span>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">선택 가능한 팀 없음</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <GameDetailModal
        selectedGame={selectedGame}
        onClose={() => setSelectedGame(null)}
      />
    </main>
  );
}