import { EntryRepository } from '../../entry/repository.js';
import { Result } from '@mikuroxina/mini-fn';
import { Entry } from '../../entry/entry.js';
import { Match } from '../match.js';
import { MatchRepository } from './repository.js';
import * as crypto from 'crypto';
import { MatchDTO } from './get.js';
import { GenerateRankingService } from './generateRanking.js';

export type TournamentRank = {
  rank: number;
  points: number;
  time: number;
  entry: Entry;
};
export type Tournament = [TournamentRank, TournamentRank] | [Tournament, Tournament];
type TournamentPermutation = TournamentRank[];
type BaseTuple<T, L extends number, Tup extends T[] = []> = Tup['length'] extends L
  ? Tup
  : BaseTuple<T, L, [T, ...Tup]>;
type Tuple<T, L extends number> = BaseTuple<T, L>;

export class GenerateMatchService {
  private readonly COURSE_COUNT = 3;
  private readonly FINAL_TOURNAMENT_COUNT = 8;
  private readonly entryRepository: EntryRepository;
  private readonly matchRepository: MatchRepository;
  private readonly rankingService: GenerateRankingService;

  constructor(
    entryRepository: EntryRepository,
    matchRepository: MatchRepository,
    rankingService: GenerateRankingService
  ) {
    this.entryRepository = entryRepository;
    this.matchRepository = matchRepository;
    this.rankingService = rankingService;
  }

  // 予選対戦表の生成
  async generatePrimaryMatch(): Promise<Result.Result<Error, MatchDTO[][]>> {
    const res = await this.entryRepository.findAll();
    if (Result.isErr(res)) {
      return Result.err(res[1]);
    }

    // 分ける(N/M = A...B M[i]にA人、B人を少ない方から)
    const entry = res[1].filter((v) => v.category === 'Elementary');
    console.log(entry.length);
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
        const courseLength = courses[i].length;
        const gap = Math.floor(courseLength / 2);
        const opponentIndex = k + gap >= courseLength ? k + gap - courseLength : k + gap;
        const match = Match.new({
          id: crypto.randomUUID(),
          matchType: 'primary',
          teams: { left: courses[i][k], right: courses[i][opponentIndex] },
          courseIndex: i,
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

    return Result.ok(tmpMatches.map((v) => v.map(MatchDTO.fromDomain)));
  }

  async generateFinalMatch(
    category: 'elementary' | 'open'
  ): Promise<Result.Result<Error, Match[]>> {
    /*
    初期対戦表を生成
    1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6 (数字は順位)
     */

    const [elementaryRank] = await this.rankingService.handle();
    const openRank = await this.generateOpenTournament();
    const [elementaryTournament, openTournament] = [
      this.generateTournamentPair(this.generateTournament(elementaryRank)),
      // fixme: unwrapやめる
      this.generateTournamentPair(this.generateTournament(Result.unwrap(openRank))),
    ];

    const matches: Match[] = [];
    if (category === 'elementary') {
      for (const v of elementaryTournament) {
        matches.push(
          Match.new({
            id: crypto.randomUUID(),
            matchType: 'final',
            teams: { left: v[0].entry, right: v[1].entry },
            courseIndex: 0,
          })
        );
      }
    } else {
      for (const v of openTournament) {
        console.log(v[0].entry.id, v[1].entry.id);
        matches.push(
          Match.new({
            id: crypto.randomUUID(),
            matchType: 'final',
            teams: { left: v[0].entry, right: v[1].entry },
            courseIndex: 0,
          })
        );
      }
    }

    for (const v of matches) {
      await this.matchRepository.create(v);
    }

    return Result.ok(matches);
  }

  // generateOpenTournament オープン部門は予選を行わないのでランキング(?)を無理やり作る
  private async generateOpenTournament(): Promise<Result.Result<Error, TournamentRank[]>> {
    const res = await this.entryRepository.findAll();
    if (Result.isErr(res)) {
      return Result.err(res[1]);
    }

    return Result.ok(
      res[1]
        .filter((v) => v.category === 'Open')
        .map((v, i): TournamentRank => {
          return {
            rank: i,
            points: 0,
            time: 0,
            entry: v,
          };
        })
    );
  }

  private generateTournament(ranks: TournamentRank[]): TournamentPermutation {
    // ランキング上位8チームを取得
    ranks = ranks.slice(0, this.FINAL_TOURNAMENT_COUNT);

    const genTournament = (
      ids: TournamentRank[] | Tournament[] | Tournament
    ): TournamentPermutation => {
      if (ids.length == 2) return ids as TournamentPermutation;

      const pairs = new Array(ids.length / 2)
        .fill(null)
        .map((_, i) => [ids[i], ids[ids.length - 1 - i]] as Tournament);
      return genTournament(pairs).flat();
    };

    return genTournament(ranks);
  }

  private eachSlice = <T, L extends number>(array: T[], size: L) =>
    new Array(array.length / size)
      .fill(0)
      .map((_, i) => array.slice(i * size, (i + 1) * size) as Tuple<T, L>);

  private generateTournamentPair = (
    tournament: TournamentRank[]
  ): [TournamentRank, TournamentRank][] => this.eachSlice(tournament, 2);
}
