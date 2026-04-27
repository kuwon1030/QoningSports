"use client";

import TeamLogoBadge from "@/components/TeamLogoBadge";

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

type Props = {
  title?: string;
  sport: string;
  layout?: string;
  columns?: BracketColumn[];
  emptyMessage?: string;
};

function MatchCard({
  match,
  sport,
}: {
  match: BracketMatchCard;
  sport: string;
}) {
  return (
    <div className="w-[170px] rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
        {match.timeText}
      </div>

      <div>
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-3">
          <TeamLogoBadge teamName={match.teamA} sport={sport as any} size="sm" />
          <span className="truncate text-sm font-bold text-slate-900">
            {match.teamA}
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-3">
          <TeamLogoBadge teamName={match.teamB} sport={sport as any} size="sm" />
          <span className="truncate text-sm font-bold text-slate-900">
            {match.teamB}
          </span>
        </div>
      </div>

      <div className="border-t border-slate-100 px-3 py-3">
        <div className="text-xl font-black tracking-tight text-slate-950">
          {match.scoreText}
        </div>
        <div className="mt-1 text-xs font-semibold text-slate-500">
          {match.detailText || ""}
        </div>
      </div>
    </div>
  );
}

function SimpleBracket({
  columns,
  sport,
}: {
  columns: BracketColumn[];
  sport: string;
}) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max items-start gap-10 px-2 py-4">
        {columns.map((column) => (
          <div key={column.id} className="min-w-[190px]">
            <div className="mb-4 text-center">
              <div className="text-sm font-bold text-slate-800">{column.title}</div>
            </div>

            <div className="space-y-6">
              {column.matches.map((match) => (
                <MatchCard key={match.id} match={match} sport={sport} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NbaBracketView({
  columns,
}: {
  columns: BracketColumn[];
}) {
  if (!columns || columns.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-600">
        표시할 NBA 대진표 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max items-start gap-8 px-2 py-4">
        {columns.map((column) => (
          <div key={column.id} className="min-w-[190px]">
            <div className="mb-4 text-center">
              <div className="text-sm font-bold text-slate-800">{column.title}</div>
            </div>

            <div className="space-y-8">
              {column.matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  sport="농구"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BracketView({
  title,
  sport,
  layout,
  columns = [],
  emptyMessage,
}: Props) {
  const hasColumns =
    Array.isArray(columns) && columns.some((column) => (column.matches?.length ?? 0) > 0);

  if (!hasColumns) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-600">
        {emptyMessage || "표시할 대진표 데이터가 없습니다."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title ? <div className="text-lg font-bold text-slate-900">{title}</div> : null}

      {layout === "nba-bracket" ? (
        <NbaBracketView columns={columns} />
      ) : (
        <SimpleBracket columns={columns} sport={sport} />
      )}
    </div>
  );
}