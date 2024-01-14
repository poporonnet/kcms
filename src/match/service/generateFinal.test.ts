import { describe, it, expect } from 'vitest';
import { DummyMatchRepository } from '../adaptor/dummyRepository.js';
import { TestRankingMatchData } from '../../testData/match.js';
import { GenerateFinalMatchService } from './generateFinal.js';
import { DummyRepository } from '../../entry/adaptor/dummyRepository.js';
import { TestEntrySet } from '../../testData/entry.js';
import { GenerateRankingService } from './generateRanking.js';
import { SnowflakeIDGenerator } from '../../id/main.js';
import { Result } from '@mikuroxina/mini-fn';

describe('GenerateFinalMatchService', () => {
  const repository = new DummyMatchRepository(TestRankingMatchData);
  const entryRepository = new DummyRepository([
    TestEntrySet.ElementaryMultiWalk[101],
    TestEntrySet.ElementaryMultiWalk[102],
    TestEntrySet.ElementaryMultiWalk[103],

    TestEntrySet.ElementaryWheel[107],
    TestEntrySet.ElementaryWheel[108],
    TestEntrySet.ElementaryWheel[109],
  ]);
  const rankingService = new GenerateRankingService(repository);
  const service = new GenerateFinalMatchService(
    entryRepository,
    repository,
    rankingService,
    new SnowflakeIDGenerator(1, () => BigInt(new Date().getTime()))
  );
  // 1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6 (数字は順位)
  // cf. src/testData/match.ts
  const expected = [
    {
      left: '101',
      right: '110',
    },
    {
      left: '104',
      right: '107',
    },
    {
      left: '102',
      right: '109',
    },
    {
      left: '103',
      right: '108',
    },
  ];

  it('小学生部門の初期対戦を生成できる', async () => {
    const actual = await service.handle('elementary');
    expect(Result.isOk(actual)).toBe(true);

    Result.unwrap(actual).map((v, i) => {
      expect(expected[i]).toStrictEqual({
        left: v.teams.left!.id,
        right: v.teams.right!.id,
      });
    });
  });

  // ToDo: オープン部門のテスト
});
