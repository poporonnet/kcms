import { EntryRepository } from "../../entry/repository.js";
import { Result } from "@mikuroxina/mini-fn";
import { Entry } from "../../entry/entry.js";
import { isMatchResultPair, Match } from "../match.js";
import { MatchRepository } from "./repository.js";
import * as crypto from "crypto";

export type TournamentRank = {
  rank: number;
  points: number;
  time: number;
  entry: Entry;
};
export type Tournament = [TournamentRank, TournamentRank] | [Tournament, Tournament];

export class GenerateMatchService {
  private readonly COURSE_COUNT = 3;
  private readonly entryRepository: EntryRepository;
  private readonly matchRepository: MatchRepository;

  constructor(
    entryRepository: EntryRepository,
    matchRepository: MatchRepository
  ) {
    this.entryRepository = entryRepository;
    this.matchRepository = matchRepository;
  }

  // 予選対戦表の生成
  async generatePrimaryMatch(): Promise<Result.Result<Error, Match[][]>> {
    // ToDo: DTOを返すようにする
    const res = await this.entryRepository.findAll();
    if (Result.isErr(res)) {
      return Result.err(res[1]);
    }

    // 分ける(N/M = A...B M[i]にA人、B人を少ない方から)
    const entry = res[1];
    const entryNum = entry.length;
    // コースごとの参加者数
    const entryPerCourse = Math.floor(entryNum / this.COURSE_COUNT);
    // 余り
    const entryRemain = entryNum % this.COURSE_COUNT;

    // 振り分ける
    const courses: Entry[][] = [];
    for (let i = 0; i < this.COURSE_COUNT; i++) {
      const course = entry.slice(i * entryPerCourse, (i + 1) * entryPerCourse);
      if (entryRemain > i) {
        course.push(entry[entryPerCourse * this.COURSE_COUNT + i]);
      }
      courses[i] = course;
    }

    const tmpMatches: Match[][] = [];
    for (let i = 0; i < courses.length; i++) {
      const courseMatches: Match[] = [];
      for (let k = 0; k < courses[i].length; k++) {
        // 対戦相手のインデックス
        const opponentIndex = k + 1 >= courses[i].length ? 0 : k + 1;
        const match = Match.new({
          id: crypto.randomUUID(),
          matchType: "primary",
          teams: { Left: courses[i][k], Right: courses[i][opponentIndex] },
          courseIndex: i
        });
        courseMatches.push(match);
      }
      tmpMatches.push(courseMatches);
    }

    for (const v of tmpMatches) {
      for (const match of v) {
        await this.matchRepository.create(match);
      }
    }

    return Result.ok(tmpMatches);
  }

  // ToDo: 本選トーナメント対戦表の生成
  async generateFinalMatch(): Promise<Result.Result<Error, Match[]>> {
    /*
    初期対戦表を生成
    1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6 (数字は順位)
     */

    const rank = await this.generateRanking();
    const [elementaryTournament] = [
      this.tournament(rank[0]),
      this.tournament(rank[1])
    ]
    console.log(JSON.stringify(this.tournament(rank[1])))
    // 初期トーナメントから試合を生成する
    const a = this.flattenTournament(elementaryTournament);
    console.log(a);
    // ToDo: 部門ごとにトーナメントを生成
    return Result.ok([]);
  }

  // ToDo: 本戦の順位を計算できるようにする
  // - ToDo: (予選)タイムと得点が同じ場合だったときの順位決定処理
  // - ToDo: 部門ごとにランキングを生成できるように -> OK
  async generateRanking(): Promise<TournamentRank[][]> {
    const res = await this.matchRepository.findAll();
    if (Result.isErr(res)) {
      throw res[1];
    }
    // チームごとの得点/時間
    const rankBase: TournamentRank[] = [];
    // チームごとの得点を計算したい
    // -> まず全ての対戦を取得
    for (const v of res[1]) {
      // 本選は関係ないので飛ばす
      if (v.matchType !== "primary") continue;
      // 終わってない場合は飛ばす
      if (!v.results) continue;
      if (!isMatchResultPair(v.results)) continue;

      // 対戦の結果を取って、tournamentRankを作る
      const left = v.results.Left;
      const right = v.results.Right;

      // 左チームの結果を追加
      const leftRank = rankBase.find(v => v.entry.id === left.teamID);
      if (!leftRank) {
        // なければ作る
        rankBase.push(<TournamentRank>{
          rank: 0,
          points: left.points,
          time: left.time,
          entry: v.teams.Left
        });
      } else {
        // あれば足す
        leftRank.points += left.points;
        leftRank.time += left.time;
      }

      // 右チームの結果を追加
      const rightRank = rankBase.find(v => v.entry.id === right.teamID);
      if (!rightRank) {
        // なければ作る
        rankBase.push(<TournamentRank>{
          rank: 0,
          points: right.points,
          time: right.time,
          entry: v.teams.Right
        });
      } else {
        // あれば足す
        rightRank.points += right.points;
        rightRank.time += right.time;
      }

    }

    // 部門ごとに分ける [0]: Elementary, [1]: Open
    const categoryRank: TournamentRank[][] = [[],[]];
    for (const v of rankBase) {
      if (v.entry.category === "Elementary") {
        categoryRank[0].push(v);
      }
      if (v.entry.category === "Open") {
        categoryRank[1].push(v);
      }
    }

    const sortAndRanking = (t: TournamentRank[]) => {
      // ソートする
      t.sort((a, b) => {
        if (a.points === b.points) {
          // 得点が同じならゴールタイムが*早い順に*ソート (得点とは逆)
          return a.time - b.time;
        }
        return b.points - a.points;
      });
      // ソートが終わったら順位をつける
      return t.map((v, i) => {
        v.rank = i + 1;
        return v;
      });
    }

    return [
      sortAndRanking(categoryRank[0]),
      sortAndRanking(categoryRank[1])
    ]
  }

  private tournament(ids: TournamentRank[] | Tournament[] | Tournament): Tournament {
    if (ids.length == 2) return ids as Tournament; // この場合必ずTournament

    const pairs = new Array(ids.length / 2).fill(null).map((_, i) => [ids[i], ids[ids.length - 1 - i]] as Tournament);
    return this.tournament(pairs);
  }

  private flattenTournament(t: Tournament): [TournamentRank, TournamentRank] {
    const isTournamentRank = (t: TournamentRank | Tournament): t is TournamentRank => {
      return (t as TournamentRank).rank !== undefined;
    }
    const isTournament = (t: TournamentRank | Tournament): t is Tournament => {
      return Array.isArray(t) && t.length === 2;
    }

    if (Array.isArray(t)) {
      const [rank1, rank2] = t;
      if (isTournamentRank(rank1) && isTournamentRank(rank2)) {
        return [rank1, rank2];
      } else if (isTournament(rank1) && isTournament(rank2)) {
        return this.flattenTournament(rank1);
      }
    }
    throw new Error('Invalid tournament structure');
  }

}
