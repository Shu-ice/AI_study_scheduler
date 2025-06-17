# 週間バーティカル計画表アプリ

AIチャット機能を搭載した週間縦型スケジュール管理アプリケーション

## 概要

このアプリケーションは、一日（6時～24時）を縦軸に、日曜日から土曜日を横軸に配置した週間ビューで、スケジュール管理を行うWebアプリケーションです。AIチャット機能により、自然言語でタスクを入力し、最適なスケジュール配置を提案します。

## 主要機能

### ✅ 実装予定の機能

- **週間バーティカル表示**: 時間×曜日のグリッド形式でスケジュールを視覚化
- **固定スケジュール管理**: 定期的な予定の事前登録と繰り返し設定
- **AIチャットによるタスク配置**: 自然言語入力でタスクを追加し、AIが最適な配置を提案
- **日別詳細ビュー**: 特定の日の詳細表示と実績入力
- **計画・実績比較**: 計画と実際の行動の差異を可視化

### 🎯 コア価値

- **直感的な週間ビュー**: 一週間のスケジュールを一目で把握
- **AI による最適化**: 空き時間を効率的に活用するタスク配置
- **計画と実績の管理**: 振り返りによる継続的な改善

## 技術スタック

### フロントエンド
- **Next.js 14** (App Router)
- **React 18** with TypeScript
- **Tailwind CSS** + Headless UI
- **Zustand** (状態管理)
- **date-fns** (日付処理)

### バックエンド
- **Next.js API Routes**
- **Prisma ORM** + PostgreSQL
- **NextAuth.js** (認証)

### AI統合
- **OpenAI GPT-4 API**

### デプロイ・インフラ
- **Vercel** (ホスティング)
- **Vercel Postgres** (データベース)

## 開発ロードマップ

### Phase 1: MVP（基本機能）
- [x] プロジェクト初期設定
- [ ] データベース設計とPrismaセットアップ
- [ ] 基本認証システム
- [ ] レスポンシブレイアウト
- [ ] 週間カレンダーグリッドコンポーネント

### Phase 2: コア機能
- [ ] 固定スケジュールのCRUD機能
- [ ] 基本タスク管理機能
- [ ] 繰り返しスケジュール機能

### Phase 3: AI統合
- [ ] AI API統合とエラーハンドリング
- [ ] AIチャットインターフェース
- [ ] 自然言語タスク解析機能
- [ ] スケジュール配置提案アルゴリズム

### Phase 4: 高度な機能
- [ ] 日別詳細ビュー
- [ ] 計画・実績比較機能
- [ ] 統計・分析ダッシュボード

## 開発環境のセットアップ

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.local に必要なAPIキーを設定

# データベースのセットアップ
npm run db:generate
npm run db:push

# 開発サーバーの起動
npm run dev
```

## 環境変数

```bash
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# OpenAI
OPENAI_API_KEY="sk-..."

# Google OAuth (optional)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

## プロジェクト構造

```
├── src/
│   ├── app/               # Next.js App Router
│   ├── components/        # Reactコンポーネント
│   ├── lib/              # ユーティリティとライブラリ
│   ├── hooks/            # カスタムフック
│   ├── store/            # Zustand ストア
│   └── types/            # TypeScript型定義
├── prisma/               # Prismaスキーマとマイグレーション
├── public/               # 静的ファイル
└── .taskmaster/          # TaskMaster AI設定
```

## データモデル

### User（ユーザー）
- id, email, name, preferences, created_at

### Schedule（スケジュール）
- id, user_id, title, start_time, end_time, date, category, is_fixed, repeat_pattern

### Task（タスク）
- id, user_id, title, estimated_duration, priority, deadline, category, status

### ActualRecord（実績記録）
- id, schedule_id, actual_start, actual_end, notes, satisfaction_rating

## 貢献方法

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 作成者

開発者 - TaskMaster AI を使用して効率的に開発

---

**注意**: このプロジェクトは開発中です。機能や仕様は予告なく変更される可能性があります。 