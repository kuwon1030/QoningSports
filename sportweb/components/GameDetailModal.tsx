import TeamLogoBadge from "@/components/TeamLogoBadge";
import {
  BaseballBatterRecord,
  BaseballPitcherRecord,
  Game,
} from "@/types/game";

function getInitials(teamName: string) {
  const words = teamName.trim().split(" ").filter(Boolean);

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function parseFormation(formation?: string) {
  if (!formation) return [4, 3, 3];

  const rows = formation
    .split("-")
    .map((n) => Number(n))
    .filter((n) => !Number.isNaN(n) && n > 0);

  return rows.length > 0 ? rows : [4, 3, 3];
}

function splitPlayersForFormation(players: string[] = [], formation?: string) {
  const keeper = players[0] ?? "GK";
  const fieldPlayers = players.slice(1);
  const formationRows = parseFormation(formation);

  const rows: string[][] = [];
  let start = 0;

  for (const count of formationRows) {
    rows.push(fieldPlayers.slice(start, start + count));
    start += count;
  }

  return { keeper, rows };
}

function PlayerChip({
  name,
  align = "center",
}: {
  name: string;
  align?: "left" | "right" | "center";
}) {
  const textAlign =
    align === "left"
      ? "text-left"
      : align === "right"
      ? "text-right"
      : "text-center";

  return (
    <div className={`min-w-[64px] rounded-2xl bg-white px-2 py-2 shadow-sm ${textAlign}`}>
      <div className="text-[11px] font-bold text-slate-900">{getInitials(name)}</div>
      <div className="mt-1 text-[10px] text-slate-700">{name}</div>
    </div>
  );
}

function HalfPitchFormation({
  teamName,
  formation,
  lineup,
  side,
}: {
  teamName: string;
  formation?: string;
  lineup?: string[];
  side: "left" | "right";
}) {
  const { keeper, rows } = splitPlayersForFormation(lineup ?? [], formation);
  const orderedRows = side === "left" ? rows : [...rows].reverse();

  return (
    <div className="rounded-3xl bg-green-50 p-4">
      <h4 className={`mb-3 text-base font-bold text-slate-900 ${side === "left" ? "text-left" : "text-right"}`}>
        {teamName} 포메이션
      </h4>

      <div className="rounded-3xl bg-[linear-gradient(180deg,#b9e6b0_0%,#9edb91_100%)] p-4">
        <div className="relative h-[360px] rounded-3xl border-4 border-white/80">
          <div className="absolute left-1/2 top-0 h-full w-0 -translate-x-1/2 border-l-2 border-white/70" />
          <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70" />
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />

          {side === "left" ? (
            <div className="absolute inset-y-0 left-0 w-1/2 p-4">
              <div className="flex h-full flex-col justify-evenly">
                <div className="flex justify-start">
                  <PlayerChip name={keeper} align="left" />
                </div>

                {orderedRows.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex justify-evenly gap-2">
                    {row.map((player, playerIndex) => (
                      <PlayerChip
                        key={`${rowIndex}-${playerIndex}`}
                        name={player}
                        align="center"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="absolute inset-y-0 right-0 w-1/2 p-4">
              <div className="flex h-full flex-col justify-evenly">
                {orderedRows.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex justify-evenly gap-2">
                    {row.map((player, playerIndex) => (
                      <PlayerChip
                        key={`${rowIndex}-${playerIndex}`}
                        name={player}
                        align="center"
                      />
                    ))}
                  </div>
                ))}

                <div className="flex justify-end">
                  <PlayerChip name={keeper} align="right" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className={`mt-3 text-sm text-slate-700 ${side === "left" ? "text-left" : "text-right"}`}>
        포메이션: {formation ?? "-"}
      </p>
    </div>
  );
}

function BatterTable({
  rows,
}: {
  rows?: BaseballBatterRecord[];
}) {
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-slate-700">타자 기록이 없습니다.</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 text-slate-800">
          <tr>
            <th className="px-3 py-2 text-left">선수</th>
            <th className="px-3 py-2 text-center">포지션</th>
            <th className="px-3 py-2 text-center">AB</th>
            <th className="px-3 py-2 text-center">H</th>
            <th className="px-3 py-2 text-center">RBI</th>
            <th className="px-3 py-2 text-center">BB</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-slate-200 bg-white">
              <td className="px-3 py-2 text-slate-900">{row.name}</td>
              <td className="px-3 py-2 text-center text-slate-800">{row.position ?? "-"}</td>
              <td className="px-3 py-2 text-center text-slate-800">{row.ab}</td>
              <td className="px-3 py-2 text-center text-slate-800">{row.h}</td>
              <td className="px-3 py-2 text-center text-slate-800">{row.rbi}</td>
              <td className="px-3 py-2 text-center text-slate-800">{row.bb ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PitcherTable({
  rows,
}: {
  rows?: BaseballPitcherRecord[];
}) {
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-slate-700">투수 기록이 없습니다.</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 text-slate-800">
          <tr>
            <th className="px-3 py-2 text-left">투수</th>
            <th className="px-3 py-2 text-center">IP</th>
            <th className="px-3 py-2 text-center">H</th>
            <th className="px-3 py-2 text-center">ER</th>
            <th className="px-3 py-2 text-center">BB</th>
            <th className="px-3 py-2 text-center">SO</th>
            <th className="px-3 py-2 text-center">P</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-slate-200 bg-white">
              <td className="px-3 py-2 text-slate-900">{row.name}</td>
              <td className="px-3 py-2 text-center text-slate-800">{row.ip}</td>
              <td className="px-3 py-2 text-center text-slate-800">{row.h}</td>
              <td className="px-3 py-2 text-center text-slate-800">{row.er}</td>
              <td className="px-3 py-2 text-center text-slate-800">{row.bb}</td>
              <td className="px-3 py-2 text-center text-slate-800">{row.so}</td>
              <td className="px-3 py-2 text-center text-slate-800">{row.pitches ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-4 text-sm text-slate-700 shadow-sm">
      {text}
    </div>
  );
}

export default function GameDetailModal({
  selectedGame,
  onClose,
}: {
  selectedGame: Game | null;
  onClose: () => void;
}) {
  if (!selectedGame) return null;

  const awayLineup = selectedGame.awayLineup ?? selectedGame.lineup ?? [];
  const homeLineup = selectedGame.homeLineup ?? [];
  const awayFormation =
    selectedGame.awayFormation ?? selectedGame.formation ?? undefined;
  const homeFormation = selectedGame.homeFormation ?? undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-7xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-600">{selectedGame.league}</p>
            <h2 className="text-2xl font-bold text-slate-900">경기 상세</h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800"
          >
            닫기
          </button>
        </div>

        <div className="mb-6 rounded-3xl bg-slate-100 p-6">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="flex flex-col items-center text-center">
              <TeamLogoBadge teamName={selectedGame.away} sport={selectedGame.sport} size="lg" />
              <p className="mt-3 text-base font-semibold text-slate-900">
                {selectedGame.away}
              </p>
            </div>

            <div className="text-center">
              <p className="text-sm text-slate-600">{selectedGame.league}</p>
              <div className="mt-2 text-4xl font-bold text-slate-900">
                {selectedGame.score ?? "-"}
              </div>
              <p className="mt-2 text-sm text-slate-700">
                {selectedGame.timeLabel ?? "-"}
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <TeamLogoBadge teamName={selectedGame.home} sport={selectedGame.sport} size="lg" />
              <p className="mt-3 text-base font-semibold text-slate-900">
                {selectedGame.home}
              </p>
            </div>
          </div>
        </div>

        {selectedGame.sport === "축구" && (
          <div className="space-y-6">
            <div className="rounded-3xl bg-slate-100 p-5">
              <h3 className="mb-4 text-lg font-bold text-slate-900">이벤트 타임라인</h3>

              {selectedGame.events && selectedGame.events.length > 0 ? (
                <div className="space-y-3">
                  {selectedGame.events.map((event, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-2xl bg-white px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {event.type === "goal" && "⚽"}
                          {event.type === "yellow" && "🟨"}
                          {event.type === "red" && "🟥"}
                        </span>
                        <span className="font-medium text-slate-900">{event.player}</span>
                      </div>
                      <span className="text-sm text-slate-700">{event.time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyBlock text="현재 연동된 축구 무료 데이터에서는 이벤트 타임라인이 없는 경우가 많습니다." />
              )}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="space-y-5">
                <div className="rounded-3xl bg-slate-100 p-5">
                  <h3 className="mb-4 text-lg font-bold text-slate-900">{selectedGame.away} 라인업</h3>
                  {awayLineup.length > 0 ? (
                    <div className="space-y-2 text-sm">
                      {awayLineup.map((player, index) => (
                        <div
                          key={index}
                          className="rounded-xl bg-white px-4 py-2 text-left text-slate-900"
                        >
                          {index + 1}. {player}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyBlock text="현재 연동된 무료 축구 데이터에서는 라인업이 제공되지 않습니다." />
                  )}
                </div>

                {awayLineup.length > 0 && awayFormation ? (
                  <HalfPitchFormation
                    teamName={selectedGame.away}
                    formation={awayFormation}
                    lineup={awayLineup}
                    side="left"
                  />
                ) : (
                  <div className="rounded-3xl bg-green-50 p-5">
                    <h4 className="mb-3 text-base font-bold text-slate-900">
                      {selectedGame.away} 포메이션
                    </h4>
                    <EmptyBlock text="현재 연동된 무료 축구 데이터에서는 포메이션이 제공되지 않습니다." />
                  </div>
                )}
              </div>

              <div className="space-y-5">
                <div className="rounded-3xl bg-slate-100 p-5">
                  <h3 className="mb-4 text-lg font-bold text-right text-slate-900">
                    {selectedGame.home} 라인업
                  </h3>
                  {homeLineup.length > 0 ? (
                    <div className="space-y-2 text-sm">
                      {homeLineup.map((player, index) => (
                        <div
                          key={index}
                          className="rounded-xl bg-white px-4 py-2 text-right text-slate-900"
                        >
                          {player} .{index + 1}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyBlock text="현재 연동된 무료 축구 데이터에서는 라인업이 제공되지 않습니다." />
                  )}
                </div>

                {homeLineup.length > 0 && homeFormation ? (
                  <HalfPitchFormation
                    teamName={selectedGame.home}
                    formation={homeFormation}
                    lineup={homeLineup}
                    side="right"
                  />
                ) : (
                  <div className="rounded-3xl bg-green-50 p-5">
                    <h4 className="mb-3 text-base font-bold text-right text-slate-900">
                      {selectedGame.home} 포메이션
                    </h4>
                    <EmptyBlock text="현재 연동된 무료 축구 데이터에서는 포메이션이 제공되지 않습니다." />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedGame.sport === "야구" && (
          <div className="space-y-6">
            <div className="rounded-3xl bg-slate-100 p-5">
              <h3 className="mb-4 text-lg font-bold text-slate-900">경기 정보</h3>
              <div className="space-y-3 rounded-2xl bg-white p-4">
                <p className="text-sm text-slate-800">
                  <span className="font-semibold text-slate-900">선발투수</span>{" "}
                  <span>{selectedGame.startingPitchers ?? "기본 경기 일정 데이터"}</span>
                </p>
                <p className="text-sm text-slate-800">
                  <span className="font-semibold text-slate-900">현재 투수</span>{" "}
                  <span>{selectedGame.currentPitcher ?? "-"}</span>
                </p>
                <p className="text-sm text-slate-800">
                  <span className="font-semibold text-slate-900">투구수</span>{" "}
                  <span>{selectedGame.pitchCount ?? "-"}</span>
                </p>
                <p className="text-sm text-slate-800">
                  <span className="font-semibold text-slate-900">현재 타자</span>{" "}
                  <span>{selectedGame.batter ?? "-"}</span>
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-slate-100 p-5">
              <h3 className="mb-4 text-lg font-bold text-slate-900">라인업</h3>
              {selectedGame.lineup && selectedGame.lineup.length > 0 ? (
                <div className="grid gap-2 text-sm md:grid-cols-2">
                  {selectedGame.lineup.map((player, index) => (
                    <div
                      key={index}
                      className="rounded-xl bg-white px-4 py-2 text-slate-900"
                    >
                      {index + 1}. {player}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyBlock text="현재 연동된 무료 야구 데이터에서는 라인업이 제공되지 않을 수 있습니다." />
              )}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-3xl bg-slate-100 p-5">
                <h3 className="mb-4 text-lg font-bold text-slate-900">타자 기록</h3>
                <BatterTable rows={selectedGame.batterRecords} />
              </div>

              <div className="rounded-3xl bg-slate-100 p-5">
                <h3 className="mb-4 text-lg font-bold text-slate-900">투수 기록</h3>
                <PitcherTable rows={selectedGame.pitcherRecords} />
              </div>
            </div>
          </div>
        )}

        {selectedGame.sport === "농구" && (
          <div className="rounded-3xl bg-slate-100 p-5">
            <h3 className="mb-4 text-lg font-bold text-slate-900">경기 상세</h3>
            <EmptyBlock text="현재 연동된 무료 농구 데이터에서는 기본 경기 일정/스코어 중심으로 표시됩니다." />
          </div>
        )}

        {selectedGame.sport === "미식축구" && (
          <div className="rounded-3xl bg-slate-100 p-5">
            <h3 className="mb-4 text-lg font-bold text-slate-900">경기 상세</h3>
            <EmptyBlock text="현재 연동된 무료 미식축구 데이터에서는 기본 경기 일정/스코어 중심으로 표시됩니다." />
          </div>
        )}
      </div>
    </div>
  );
}