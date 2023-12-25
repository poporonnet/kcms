import { Match, MatchTeams } from "../match.js";
import { MatchRepository } from "../service/repository.js";
import { Option, Result } from "@mikuroxina/mini-fn";
import { readFile, writeFile } from "node:fs/promises";
import { EntryJSON } from "../../entry/adaptor/json.js";
import { Entry } from "../../entry/entry.js";

interface JSONData {
  match: Array<MatchJSON>;
  entry: Array<object>;
}

interface matchResultJSON {
  teamID: string;
  points: number;
  time: number;
}

interface matchResultPairJSON {
  Left: matchResultJSON;
  Right: matchResultJSON;
}

interface matchResultFinalPairJSON {
  results: [matchResultPairJSON, matchResultPairJSON];
  winnerID: string;
}

interface MatchJSON {
  id: string;
  matchType: string;
  courseIndex: number;
  teams: {
    Left: EntryJSON | undefined;
    Right: EntryJSON | undefined;
  };
  results?: matchResultPairJSON | matchResultFinalPairJSON;
}

export class JSONMatchRepository implements MatchRepository {
  private readonly data: Match[];

  private constructor(data?: Array<Match>) {
    this.data = data ?? [];
  }

  public static async new(): Promise<JSONMatchRepository> {
    const data = await this.load();
    return new JSONMatchRepository(data);
  }

  public async create(match: Match): Promise<Result.Result<Error, Match>> {
    this.data.push(match);
    await this.save();
    return Result.ok(match);
  }

  public async findByID(id: string): Promise<Option.Option<Match>> {
    const match = this.data.find((m) => m.id === id);
    if (!match) {
      return Option.none();
    }

    return Option.some(match);
  }

  public async update(match: Match): Promise<Result.Result<Error, Match>> {
    const i = this.data.findIndex((m) => m.id === match.id);
    this.data[i] = match;

    await this.save();
    return Result.ok(match);
  }

  private async save() {
    const data = await readFile("./data.json", "utf-8");
    const baseData = JSON.parse(data) as JSONData;

    baseData.match = this.data.map((m) => JSONMatchRepository.matchToJSON(m));
    await writeFile("./data.json", JSON.stringify(baseData), "utf-8");
  }

  private static async load(): Promise<Match[]> {
    const data = await readFile("./data.json", "utf-8");
    const parsed = JSON.parse(data) as JSONData;

    return parsed.match.map((i) => this.jsonToMatch(i));
  }

  private static matchToJSON(match: Match): MatchJSON {
    const covertToEntryJSON = (
      entry: Entry | undefined,
    ): EntryJSON | undefined => {
      if (!entry) {
        return entry;
      }

      return {
        id: entry.id,
        teamName: entry.teamName,
        members: entry.members,
        isMultiWalk: entry.isMultiWalk,
        category: entry.category,
      };
    };

    return {
      id: match.id,
      teams: {
        Left: covertToEntryJSON(match.teams.Left),
        Right: covertToEntryJSON(match.teams.Right),
      },
      matchType: match.matchType,
      courseIndex: match.courseIndex,
      results: match.results,
    };
  }

  private static jsonToMatch(json: MatchJSON): Match {
    return Match.reconstruct({
      id: json.id,
      teams: json.teams as MatchTeams,
      matchType: json.matchType as "primary" | "final",
      // ToDo: MatchPointsのパース
      courseIndex: json.courseIndex,
      results: json.results,
    });
  }
}
