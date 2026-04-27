"use client";

import { useEffect, useMemo, useState } from "react";
import { SportType } from "@/types/game";

type Size = "xs" | "sm" | "md" | "lg";

type Props = {
  teamName: string;
  sport: SportType;
  size?: Size;
};

const cache = new Map<string, string | null>();

const NAME_ALIASES: Record<string, string> = {
  // 축구
  "Tottenham Hotspur FC": "Tottenham Hotspur",
  "Manchester United FC": "Manchester United",
  "Manchester City FC": "Manchester City",
  "Newcastle United FC": "Newcastle United",
  "Wolverhampton Wanderers FC": "Wolverhampton Wanderers",
  "Brighton & Hove Albion FC": "Brighton & Hove Albion",
  "Leicester City FC": "Leicester City",
  "Leeds United FC": "Leeds United",
  "Nottingham Forest FC": "Nottingham Forest",
  "Crystal Palace FC": "Crystal Palace",
  "Aston Villa FC": "Aston Villa",
  "Everton FC": "Everton",
  "West Ham United FC": "West Ham United",
  "Brentford FC": "Brentford",
  "Arsenal FC": "Arsenal",
  "Chelsea FC": "Chelsea",
  "Liverpool FC": "Liverpool",
  "Fulham FC": "Fulham",
  "Bournemouth FC": "AFC Bournemouth",
  "Paris Saint-Germain FC": "Paris Saint-Germain",
  "FC Internazionale Milano": "Inter Milan",
  "AC Milan": "AC Milan",
  "Juventus FC": "Juventus",
  "SS Lazio": "Lazio",
  "SSC Napoli": "Napoli",
  "AS Roma": "Roma",
  "FC Bayern München": "Bayern Munich",
  "Borussia Dortmund": "Borussia Dortmund",
  "Bayer 04 Leverkusen": "Bayer Leverkusen",
  "RB Leipzig": "RB Leipzig",
  "Atlético de Madrid": "Atletico Madrid",
  "Club Atlético de Madrid": "Atletico Madrid",
  "FC Barcelona": "Barcelona",
  "Real Madrid CF": "Real Madrid",
  "Athletic Club": "Athletic Bilbao",
  "Olympique de Marseille": "Marseille",
  "Olympique Lyonnais": "Lyon",
  "OGC Nice": "Nice",
  "LOSC Lille": "Lille",
  "AS Monaco FC": "AS Monaco",
  "Toulouse FC": "Toulouse",
  "Stade Rennais FC 1901": "Rennes",
  "Stade Brestois 29": "Brest",
  "FC Union Berlin": "Union Berlin",
  "FSV Mainz 05": "Mainz 05",
  "1. FC Köln": "FC Köln",
  "1. FC Heidenheim 1846": "Heidenheim",
  "Borussia Mönchengladbach": "Borussia Monchengladbach",
  "Como 1907": "Como",
  "Parma Calcio 1913": "Parma",
  "Genoa CFC": "Genoa",
  "Cagliari Calcio": "Cagliari",
  "Hellas Verona FC": "Hellas Verona",
  "Deportivo Alavés": "Alaves",
  "CA Osasuna": "Osasuna",
  "Getafe CF": "Getafe",
  "Girona FC": "Girona",
  "Elche CF": "Elche",
  "RCD Espanyol de Barcelona": "Espanyol",
  "Levante UD": "Levante",
  "Sporting Clube de Portugal": "Sporting CP",

  // 약칭
  "Man United": "Manchester United",
  "Man City": "Manchester City",
  Spurs: "Tottenham Hotspur",
  Wolves: "Wolverhampton Wanderers",
  PSG: "Paris Saint-Germain",
  Inter: "Inter Milan",
  Milan: "AC Milan",
  Bayern: "Bayern Munich",
  Dortmund: "Borussia Dortmund",
  Atleti: "Atletico Madrid",
  Barca: "Barcelona",

  // 농구
  Sixers: "Philadelphia 76ers",
  "76ers": "Philadelphia 76ers",
  Cavs: "Cleveland Cavaliers",
  Clippers: "LA Clippers",
  Lakers: "Los Angeles Lakers",
  Knicks: "New York Knicks",
  Hawks: "Atlanta Hawks",
  Celtics: "Boston Celtics",
  Raptors: "Toronto Raptors",
  Thunder: "Oklahoma City Thunder",
  Suns: "Phoenix Suns",
  WolvesNBA: "Minnesota Timberwolves",
  "Trail Blazers": "Portland Trail Blazers",

  // 야구
  Dodgers: "Los Angeles Dodgers",
  Yankees: "New York Yankees",
  Padres: "San Diego Padres",
  Giants: "San Francisco Giants",
  "Blue Jays": "Toronto Blue Jays",
  Cubs: "Chicago Cubs",

  // 미식축구
  Chiefs: "Kansas City Chiefs",
  Bills: "Buffalo Bills",
  Eagles: "Philadelphia Eagles",
  Cowboys: "Dallas Cowboys",
};

function normalizeTeamName(name: string) {
  return NAME_ALIASES[name] ?? name;
}

function getInitials(name: string) {
  const parts = name
    .replace(/FC|CF|SC|AC|BC|AFC|Utd|United|Club|Calcio/gi, "")
    .split(" ")
    .filter(Boolean);

  if (parts.length === 0) return "TM";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function getSizeClass(size: Size) {
  switch (size) {
    case "xs":
      return "h-6 w-6 text-[10px]";
    case "sm":
      return "h-8 w-8 text-[11px]";
    case "md":
      return "h-10 w-10 text-xs";
    case "lg":
      return "h-14 w-14 text-sm";
    default:
      return "h-8 w-8 text-[11px]";
  }
}

export default function TeamLogoBadge({
  teamName,
  sport,
  size = "sm",
}: Props) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const normalizedName = useMemo(() => normalizeTeamName(teamName), [teamName]);
  const cacheKey = `${sport}:${normalizedName}`;

  useEffect(() => {
    let cancelled = false;

    async function loadLogo() {
      if (!normalizedName) {
        setLogoUrl(null);
        return;
      }

      if (cache.has(cacheKey)) {
        setLogoUrl(cache.get(cacheKey) ?? null);
        return;
      }

      try {
        const response = await fetch(
          `/api/logos?name=${encodeURIComponent(normalizedName)}&sport=${encodeURIComponent(
            sport
          )}`,
          { cache: "force-cache" }
        );

        const json = await response.json();
        const url = json?.logoUrl ?? null;

        cache.set(cacheKey, url);

        if (!cancelled) {
          setLogoUrl(url);
        }
      } catch {
        cache.set(cacheKey, null);
        if (!cancelled) {
          setLogoUrl(null);
        }
      }
    }

    loadLogo();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, normalizedName, sport]);

  const sizeClass = getSizeClass(size);

  if (logoUrl) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm ${sizeClass}`}
      >
        <img
          src={logoUrl}
          alt={teamName}
          className="h-full w-full object-contain p-1"
          onError={() => setLogoUrl(null)}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 font-bold text-slate-700 shadow-sm ${sizeClass}`}
    >
      {getInitials(normalizedName)}
    </div>
  );
}