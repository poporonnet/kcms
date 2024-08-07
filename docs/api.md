## Api Reference

### endpoint list

- `POST /entry` エントリー
- `DELETE /entry/{id}` エントリーの取り消し
- `GET /entry` 全エントリーの取得
- `GET /match/{matchType}` 部門の(予選/本選)対戦表
- `POST /match/{matchType}` 部門の対戦表を生成

### `POST /entry`

エントリーします

#### 入力

body: `application/json`

| 項目名      | 型(TS表記)                       | 説明                   | 備考                                     |
| ----------- | -------------------------------- | ---------------------- | ---------------------------------------- |
| teamName    | `string`                         | チーム名               | 重複するとエラー                         |
| members     | `[string, string]`               | メンバーの名前         | 小学生部門: 1 or 2人 / オープン部門: 1人 |
| isMultiWalk | `boolean`                        | ロボットが多足歩行型か |                                          |
| category    | `"Elementary" or "Open"` (union) | 出場する部門           |                                          |

#### 出力

##### `200 OK`

```json
{
  "id": "39440930485098",
  "teamName": "ニカ.reverse()",
  "members": ["木下竹千代", "織田幸村"],
  "isMultiWalk": false,
  "category": "Elementary"
}
```

##### `400 Bad Request`

- `TOO_MANY_MEMBERS`: メンバー数が多すぎる

```json
{
  "error": "TOO_MANY_MEMBERS"
}
```

### `DELETE /entry/{id}`

エントリーを取り消します

#### 入力

パスパラメータ

- `id`: `string`
  - 取り消すエントリーのID

body: `application/json`

```json
{}
```

#### 出力

##### `204 No Content`

取り消しました.
※レスポンスボディはありません

### `GET /entry`

全エントリーを取得します

#### 出力

##### `200 OK`

```json
[
  {
    "id": "39440930485098",
    "teamName": "ニカ.reverse()",
    "members": ["木下竹千代", "織田幸村"],
    "isMultiWalk": false,
    "category": "Elementary"
  }
]
```

### `GET /match/{matchType}`

各部門の本選、予選対戦表を取得します

#### 入力

パスパラメータ

- `matchType`: `"primary"|"final"`
  - 部門名

#### 出力

##### `200 OK`

```jsonc
[
  {
    // 試合ID
    "id": "43945095",
    // 試合するチームのID
    "teams": [
      {
        "id": "30495883404",
        "teamName": "ニカ.reverse()",
        "isMultiWalk": false,
        "category": "Elementary"
      },
      {
        "id": "93454093",
        "teamName": "カニ.reverse()",
        "isMultiWalk": false,
        "category": "Elementary"
      }
    ],
    // 対戦の種類
    "matchType": "primary",
    // チームごとの得点 (teamsと同じ順で入る)
    "points": [2, 5],
    "courseIndex": 1,
    // チームごとのゴール時間(秒)
    "time": [50, 61],
    // 勝利チームのID
    "winnerID": "93454093"
  }
]
```

##### `404 Not Found`

- `UNKNOWN_CATEGORY`: 存在しないカテゴリ
- `UNKNOWN_MATCH_TYPE`: 存在しない対戦種類

### `POST /match/{matchType}/{category}`

各部門の本選、予選対戦表を生成します
※ 既に生成済みの場合は上書きされます
※ オープン部門の予選対戦表は生成できません(エラーになります)

#### 入力

パスパラメータ

- `matchType`: `"final"|"primary"`
  - 部門名
- `category`: `"elementary"|"open"`
  - カテゴリ

```json
{}
```

#### 出力

##### `200 OK`

```jsonc
[
  {
    // 試合ID
    "id": "43945095",
    // 試合するチームのID
    "teams": {
      // コート左側チーム
      "left": {
        "id": "30495883404",
        "teamName": "ニカ.reverse()",
        "isMultiWalk": false,
        "category": "Elementary"
      },
      // コート右側チーム
      "right": {
        "id": "93454093",
        "teamName": "カニ.reverse()",
        "isMultiWalk": false,
        "category": "Elementary"
      }
    },
    // 対戦の種類
    "matchType": "primary",
    // 対戦結果
    "results": {
      // 左チームの結果
      "left": {
        "teamID": "30495883404",
        "points": 0,
        "time": 300
      },
      // 右チームの結果
      "right": {
        "teamID": "93454093",
        "points": 7,
        "time": 60
      }
    },
    // コース番号(0始まり)
    "courseIndex": 1,
    // 勝利チームのID
    "winnerID": "93454093"
  }
]
```

##### `404 Not Found`

- `UNKNOWN_CATEGORY`: 存在しないカテゴリ
- `UNKNOWN_MATCH_TYPE`: 存在しない対戦種類

### `PUT /match/{id}`

指定した試合の結果を入力します.

#### 入力

パスパラメータ

- id: `string`
  - 試合ID

body: `application/json`

```json
{
  "results": {
    "left": {
      "teamID": "8e28115e-7fa4-4359-8a68-02d1c9f7b8f6",
      "points": 0,
      "time": 300
    },
    "right": {
      "teamID": "31dface0-a745-43f1-8bd6-375e0082f5b1",
      "points": 7,
      "time": 60
    }
  }
}
```

#### 出力

##### `200 OK`

更新しました

```json
{
  "id": "8ce4ea11-acd8-4c2d-a13c-09eb24d091fd",
  "teams": {
    "left": {
      "id": "8e28115e-7fa4-4359-8a68-02d1c9f7b8f6",
      "teamName": "チーム0",
      "isMultiWalk": true,
      "category": "Open"
    },
    "right": {
      "id": "31dface0-a745-43f1-8bd6-375e0082f5b1",
      "teamName": "チーム1",
      "isMultiWalk": true,
      "category": "Elementary"
    }
  },
  "matchType": "primary",
  "courseIndex": 0,
  "results": {
    "left": {
      "teamID": "8e28115e-7fa4-4359-8a68-02d1c9f7b8f6",
      "points": 0,
      "time": 300
    },
    "right": {
      "teamID": "31dface0-a745-43f1-8bd6-375e0082f5b1",
      "points": 7,
      "time": 60
    }
  }
}
```