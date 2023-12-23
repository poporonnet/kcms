import { Entry } from "../entry/entry.js";

export type MatchTeams = Pair<Entry | undefined>;
export type MatchType = "primary" | "final";

// Match生成オプション
export interface CreateMatchArgs<T extends MatchType> {
  id: string;
  teams: MatchTeams;
  courseIndex: number;
  matchType: T;
}

export interface MatchResult {
  teamID: string;
  points: number;
  time: number;
}

// ToDo: 機が熟したら消す
// Tの要素数2のタプルを生成
export type Pair<T> = [T, T];
/*
Tがprimaryなら [MatchResult, MatchResult]、
Tがfinalなら       [[MatchResult | undefined, MatchResult  | undefined], [MatchResult  | undefined, MatchResult  | undefined]]
*/
export type MatchResultPair<T extends MatchType> = T extends "primary"
  ? Pair<MatchResult>
  : Pair<Pair<Omit<MatchResult, "time"> | undefined>>;

export interface MatchArgs<T extends MatchType> {
  // 試合ID
  id: string;
  // 試合するチームのID
  teams: MatchTeams;
  // 試合種別 primary: 予選, final: 本選
  matchType: T;
  // コース番号
  courseIndex: number;
  // 試合結果
  result?: MatchResultPair<T>;
  // 勝利チームのID
  winnerID?: T extends "primary" ? string | undefined : never;
}

export class Match<T extends MatchType> {
  // 試合ID
  private readonly _id: string;
  // 試合するチームのID
  private readonly _teams: MatchTeams;
  // 試合種別 primary: 予選, final: 本選
  private readonly _matchType: MatchType;
  // コース番号
  private readonly _courseIndex: number;
  // チームごとの得点
  private _result?: MatchResultPair<T>;
  // 勝利チームのID
  private _winnerID?: T extends "primary" ? string | undefined : never;

  private constructor(args: MatchArgs<T>) {
    this._id = args.id;
    this._teams = args.teams;
    this._result = args.result;
    this._winnerID = args.winnerID;
    this._matchType = args.matchType;
    this._courseIndex = args.courseIndex;
  }

  get id(): string {
    return this._id;
  }

  get teams(): MatchTeams {
    return this._teams;
  }

  get winnerID(): string | undefined {
    return this._winnerID;
  }

  get matchType(): MatchType {
    return this._matchType;
  }

  get courseIndex(): number {
    return this._courseIndex;
  }

  set winnerID(winnerID: T extends "primary" ? string | undefined : never) {
    this._winnerID = winnerID;
  }

  set result(
    result: T extends "primary"
      ? Pair<MatchResult>
      : Pair<Pair<Omit<MatchResult, "time">>>,
  ) {
    this._result = result;
  }

  // FIXME: 違法な感じがする
  get result(): typeof this._result {
    return this._result;
  }

  public static new<T extends MatchType>(arg: CreateMatchArgs<T>): Match<T> {
    return new Match({
      id: arg.id,
      teams: arg.teams,
      matchType: arg.matchType,
      courseIndex: arg.courseIndex,
    });
  }

  public static reconstruct<T extends MatchType>(args: MatchArgs<T>): Match<T> {
    return new Match({
      id: args.id,
      teams: args.teams,
      matchType: args.matchType,
      courseIndex: args.courseIndex,
      result: args.result,
      winnerID: args.winnerID,
    });
  }
}
