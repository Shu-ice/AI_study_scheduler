# 📅 AI Study Scheduler - 週次プランナー

Next.js 14で構築された高機能な週次プランナーアプリです。スケジュール管理、タスク管理、AI統合機能を搭載しています。

## ✨ 主な機能

### 📅 カレンダー機能
- **週次表示**: 美しい週次カレンダーグリッド
- **時間帯別グラデーション**: 時間に応じた動的な背景色
  - 早朝 (5-8時): 朝焼けカラー (amber-orange-yellow)
  - 午前 (8-11時): フレッシュカラー (emerald-teal-cyan)
  - 正午 (11-14時): 明るい空 (sky-blue-indigo)
  - 午後 (14-17時): 落ち着いたカラー (indigo-purple-violet)
  - 夕方 (17-20時): 夕焼けカラー (rose-pink-fuchsia)
  - 夜 (20-23時): 深夜カラー (indigo-purple-slate)
  - 深夜 (23-5時): 最深夜カラー (slate-gray-stone)

### 📋 スケジュール管理
- **直感的な操作**: ドラッグ&ドロップでスケジュール移動
- **クリック優先**: Altキー + ドラッグでドラッグモード
- **時間表示**: HH:MM形式での正確な時間表示
- **カテゴリ管理**: 色分けされたカテゴリシステム
- **日本の祝日対応**: 日曜日と祝日の特別表示

### 🤖 AI統合
- **OpenAI連携**: GPTを使用したスケジュール提案
- **タスク分析**: AIによるタスクの自動分析
- **スマート提案**: コンテキストに基づく提案機能

### 🔐 認証システム
- **NextAuth.js**: セキュアな認証システム
- **セッション管理**: 適切なセッション状態管理
- **ハイドレーション対応**: SSRとクライアント間の同期

### 🎨 UI/UX
- **Tailwind CSS**: モダンで美しいデザイン
- **レスポンシブ**: モバイル・デスクトップ対応
- **アニメーション**: スムーズなインタラクション
- **アクセシビリティ**: WCAG準拠のアクセシブルなUI

## 🛠️ 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **ランタイム**: React 18
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **データベース**: SQLite (Prisma ORM)
- **認証**: NextAuth.js
- **AI**: OpenAI API
- **状態管理**: React Hooks + Context
- **UI コンポーネント**: カスタムコンポーネント

## 🚀 セットアップ

### 必要な環境
- Node.js 18.0+
- npm または yarn

### インストール手順

1. **リポジトリのクローン**
```bash
git clone https://github.com/Shu-ice/AI_study_scheduler.git
cd AI_study_scheduler
```

2. **依存関係のインストール**
```bash
npm install
```

3. **環境変数の設定**
```bash
cp .env.example .env
```

`.env`ファイルを編集して以下の環境変数を設定：
```env
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
OPENAI_API_KEY=your-openai-api-key
DATABASE_URL="file:./dev.db"
```

4. **データベースの初期化**
```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

5. **開発サーバーの起動**
```bash
npm run dev
```

アプリは `http://localhost:3000` で起動します。

## 📁 プロジェクト構造

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API ルート
│   └── page.tsx           # メインページ
├── components/            # Reactコンポーネント
│   ├── calendar/          # カレンダー関連
│   ├── ui/               # UI コンポーネント
│   └── auth/             # 認証関連
├── hooks/                # カスタムフック
├── lib/                  # ユーティリティライブラリ
├── types/                # TypeScript型定義
└── utils/                # ヘルパー関数
```

## 🔧 主要機能の詳細

### カレンダーコンポーネント
- `WeeklyGrid.tsx`: メインのカレンダーグリッド
- `ScheduleBlock.tsx`: 個別スケジュールブロック
- `ScheduleModal.tsx`: スケジュール編集モーダル

### カスタムフック
- `useTaskManagement.ts`: タスク管理ロジック
- `useDragAndDrop.ts`: ドラッグ&ドロップ機能
- `useCalendarSettings.ts`: カレンダー設定管理

### API エンドポイント
- `/api/schedules`: スケジュール CRUD
- `/api/tasks`: タスク管理
- `/api/ai/`: AI機能のエンドポイント

## 🎨 カスタマイズ

### テーマカラー
`src/lib/colors.ts`でカラーパレットをカスタマイズできます。

### 時間帯グラデーション
`src/components/calendar/WeeklyGrid.tsx`の`getTimeBasedGradient`関数で時間帯別の色を調整できます。

## 🐛 デバッグ

### 開発ツール
- `/debug`: 開発者向けデバッグページ
- `PerformanceMonitor.tsx`: パフォーマンス監視
- `MemoryLeakDetector.tsx`: メモリリーク検出

### ログレベル
環境変数`LOG_LEVEL`でログレベルを調整できます：
- `debug`: 詳細ログ
- `info`: 一般情報
- `warn`: 警告のみ
- `error`: エラーのみ

## 📊 パフォーマンス最適化

- **React.memo**: 不要な再レンダリングを防止
- **useCallback/useMemo**: 計算結果のキャッシュ
- **仮想化**: 大量データの効率的な表示
- **遅延読み込み**: コンポーネントの遅延ロード

## 🤝 コントリビューション

1. フォークしてください
2. 機能ブランチを作成: `git checkout -b feature/amazing-feature`
3. 変更をコミット: `git commit -m 'Add amazing feature'`
4. ブランチにプッシュ: `git push origin feature/amazing-feature`
5. プルリクエストを開いてください

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🙏 謝辞

- OpenAI GPT API
- Next.js チーム
- Tailwind CSS
- Prisma
- すべてのオープンソースコントリビューター

---

**🌟 このプロジェクトが役に立ったら、ぜひスターをつけてください！** 