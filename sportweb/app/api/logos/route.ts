import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 60 * 60 * 24;

function normalizeTeamName(name: string) {
  return name
    .replace(/\bFC\b/gi, "")
    .replace(/\bCF\b/gi, "")
    .replace(/\bBC\b/gi, "")
    .replace(/\bAC\b/gi, "")
    .replace(/\bSC\b/gi, "")
    .replace(/\bAFC\b/gi, "")
    .replace(/\bC\.F\.\b/gi, "")
    .replace(/\bF\.C\.\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCandidateNames(name: string) {
  const normalized = normalizeTeamName(name);

  const aliases = new Map<string, string[]>([
    ["Manchester United FC", ["Manchester United"]],
    ["Manchester City FC", ["Manchester City"]],
    ["Arsenal FC", ["Arsenal"]],
    ["Chelsea FC", ["Chelsea"]],
    ["Liverpool FC", ["Liverpool"]],
    ["Brentford FC", ["Brentford"]],
    ["RCD Espanyol de Barcelona", ["Espanyol"]],
    ["Levante UD", ["Levante"]],
    ["Atalanta BC", ["Atalanta"]],
    ["SS Lazio", ["Lazio"]],
    ["Udinese Calcio", ["Udinese"]],
    ["Inter", ["Inter Milan"]],
    ["AC Milan", ["Milan"]],
    ["Borussia Dortmund", ["Dortmund"]],
    ["Bayern Munich", ["Bayern München", "Bayern Munich"]],
    ["Paris Saint-Germain", ["PSG", "Paris SG"]],
    ["PSG", ["Paris Saint-Germain", "Paris SG"]],
    ["Roma", ["AS Roma", "Roma"]],
    ["Dodgers", ["Los Angeles Dodgers"]],
    ["Padres", ["San Diego Padres"]],
    ["Lakers", ["Los Angeles Lakers"]],
    ["Warriors", ["Golden State Warriors"]],
    ["Chiefs", ["Kansas City Chiefs"]],
    ["Bills", ["Buffalo Bills"]],
  ]);

  const fromAlias = aliases.get(name) ?? aliases.get(normalized) ?? [];

  return Array.from(new Set([name, normalized, ...fromAlias])).filter(Boolean);
}

function matchesRequestedSport(apiSport: string | null | undefined, sport: string) {
  if (!apiSport) return true;

  const value = apiSport.toLowerCase();

  if (sport === "축구") return value === "soccer";
  if (sport === "야구") return value === "baseball";
  if (sport === "농구") return value === "basketball";
  if (sport === "미식축구") return value === "american football";

  return true;
}

async function searchTeamBadge(name: string, sport: string) {
  const url = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(
    name
  )}`;

  const response = await fetch(url, {
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) return null;

  const json = await response.json();
  const teams = Array.isArray(json?.teams) ? json.teams : [];

  const matched =
    teams.find((team) => matchesRequestedSport(team?.strSport, sport)) ??
    teams[0];

  if (!matched) return null;

  return (
    matched?.strBadge ||
    matched?.strLogo ||
    matched?.strTeamBadge ||
    null
  );
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  const sport = request.nextUrl.searchParams.get("sport") ?? "축구";

  if (!name) {
    return NextResponse.json({ logoUrl: null }, { status: 200 });
  }

  try {
    const candidates = buildCandidateNames(name);

    for (const candidate of candidates) {
      const logoUrl = await searchTeamBadge(candidate, sport);
      if (logoUrl) {
        return NextResponse.json({ logoUrl });
      }
    }

    return NextResponse.json({ logoUrl: null });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ logoUrl: null }, { status: 200 });
  }
}