export type SportType = "축구" | "야구" | "농구" | "미식축구";

export type GameEventType = "goal" | "yellow" | "red";

export type GameEvent = {
  type: GameEventType;
  player: string;
  time: string;
};

export type BaseballBatterRecord = {
  name: string;
  position?: string;
  ab: number;
  h: number;
  rbi: number;
  bb?: number;
};

export type BaseballPitcherRecord = {
  name: string;
  ip: string;
  h: number;
  er: number;
  bb: number;
  so: number;
  pitches?: number;
};

export type Game = {
  id: number;
  sport: SportType;
  league: string;
  status: "LIVE" | "SCHEDULED";
  home: string;
  away: string;
  score?: string;
  timeLabel?: string;

  scheduledAt?: string;
  isFinished?: boolean;

  events?: GameEvent[];

  lineup?: string[];
  formation?: string;

  awayLineup?: string[];
  homeLineup?: string[];
  awayFormation?: string;
  homeFormation?: string;

  startingPitchers?: string;
  currentPitcher?: string;
  pitchCount?: number;
  batter?: string;
  bases?: [boolean, boolean, boolean];
  count?: {
    ball: number;
    strike: number;
    out: number;
  };

  batterRecords?: BaseballBatterRecord[];
  pitcherRecords?: BaseballPitcherRecord[];
};