import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 300;

const SUPPORTED_CODES = new Set(["PL", "PD", "SA", "BL1"]);

export async function GET(request: NextRequest) {
  const footballKey = process.env.FOOTBALL_DATA_API_KEY;
  const code = request.nextUrl.searchParams.get("code") ?? "PL";

  if (!footballKey) {
    return NextResponse.json(
      { rows: [], error: "FOOTBALL_DATA_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  if (!SUPPORTED_CODES.has(code)) {
    return NextResponse.json({
      competitionName: code,
      rows: [],
      error: "현재는 리그형 대회만 순위를 지원합니다.",
    });
  }

  try {
    const response = await fetch(
      `https://api.football-data.org/v4/competitions/${code}/standings`,
      {
        headers: {
          "X-Auth-Token": footballKey,
        },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { rows: [], error: "순위 데이터를 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const json = await response.json();
    const standings = Array.isArray(json?.standings) ? json.standings : [];
    const totalTable =
      standings.find((item: any) => item?.type === "TOTAL") ?? standings[0];

    const table = Array.isArray(totalTable?.table) ? totalTable.table : [];

    const rows = table.map((row: any) => ({
      position: row?.position ?? 0,
      team: row?.team?.name ?? "-",
      playedGames: row?.playedGames ?? 0,
      points: row?.points ?? 0,
      won: row?.won ?? 0,
      draw: row?.draw ?? 0,
      lost: row?.lost ?? 0,
      goalsFor: row?.goalsFor ?? 0,
      goalsAgainst: row?.goalsAgainst ?? 0,
      goalDifference: row?.goalDifference ?? 0,
    }));

    return NextResponse.json({
      competitionName: json?.competition?.name ?? code,
      rows,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { rows: [], error: "순위 데이터를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}