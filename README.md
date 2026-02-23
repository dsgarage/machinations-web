# Machinations Web

[![GitHub Pages](https://img.shields.io/badge/Demo-GitHub%20Pages-blue)](https://dsgarage.github.io/machinations-web/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Engineering Emergence** (Joris Dormans 著) に基づく、Machinations フレームワークのオープンソース Web 実装です。ブラウザ上でゲーム内経済のビジュアルシミュレーションを設計・実行できます。

> **[デモを試す](https://dsgarage.github.io/machinations-web/)**

---

## 主な機能

- **13種類のノード** -- Pool, Source, Drain, Converter, Gate, Trader, Register, End Condition, Chart, Delay, Queue, Text Label, Group
- **2種類の接続** -- Resource Connection (リソース転送) / State Connection (状態制御)
- **シミュレーション** -- 実行・停止・ステップ・リセット / 速度調整 / Quick Run / Multiple Run (モンテカルロ分析)
- **12種のサンプル** -- 基本パターンから実ゲーム分析まで内蔵
- **ダークモード** / **ミニマップ** / **チャート表示** / **自動保存**
- **外部依存なし** -- Vanilla JS のみで動作

---

## クイックスタート

```bash
git clone https://github.com/dsgarage/machinations-web.git
cd machinations-web
# 任意のローカルサーバーで起動
python3 -m http.server 8000
# ブラウザで http://localhost:8000 を開く
```

---

## 操作方法

### ノード配置

| キー | ノード | 形状 |
|:----:|--------|------|
| 2 | Pool | 円 |
| 3 | Source | 上三角 |
| 4 | Drain | 下三角 |
| 5 | Converter | 右三角 |
| 6 | Gate | ダイヤモンド |
| 7 | Trader | 六角形 |
| 8 | Register | 長方形 |
| 9 | End Condition | 二重丸 |
| 0 | Chart | 角丸四角 |
| D | Delay | 角丸四角+縦線 |
| Q | Queue | 角丸四角+3縦線 |

### 接続

| キー | 接続タイプ | 説明 |
|:----:|-----------|------|
| R | Resource Connection (実線) | リソース転送 |
| T | State Connection (破線) | 状態制御 (labelModifier / nodeModifier / trigger / activator) |

### シミュレーション / 編集

| キー | 機能 |
|------|------|
| Space | 実行/停止 |
| S | ステップ実行 |
| Delete | 選択要素削除 |
| Ctrl+Z / Y | 元に戻す / やり直し |
| Ctrl+C / V | コピー / ペースト |
| Ctrl+A | 全選択 |
| Ctrl+N | 新規 |
| Ctrl+S | 保存 |

---

## レート記法

| 記法 | 例 | 意味 |
|------|----|------|
| 数値 | `3` | 毎ステップ 3 個 |
| ダイス | `D6`, `2d6+1` | ダイスロール |
| インターバル | `/3` | 3 ステップに 1 回 |
| All-or-Nothing | `&5` | 5 個以上あれば 5 個、なければ 0 |
| パーセント | `25%` | 保有量の 25% |
| all | `all` | 全リソース |

---

## 起動モード / フローモード

**起動モード** -- Automatic (`*`) / Interactive (`target`) / Passive / OnStart (`S`)

**フローモード** -- Pull (`down`) / Push (`up`) / Push All (`up&`)

---

## サンプル一覧

| カテゴリ | サンプル |
|----------|---------|
| 基本パターン | シンプル経済, ダイナミックエンジン, 正のフィードバック |
| デザインパターン (付録B) | 静的エンジン, コンバーターエンジン, 静的摩擦, 動的摩擦, 消耗, 負のフィードバック |
| 実ゲーム分析 | リスク:コアメカニクス, SimWar:2プレイヤーRTS, ダイスゲート |

---

## アーキテクチャ

```
index.html              メイン HTML
css/style.css            スタイル (ダークモード対応)
js/
  graph.js               データモデル
  engine.js              シミュレーションエンジン
  renderer.js            SVG レンダリング
  editor.js              マウス / キーボード操作
  main.js                アプリエントリポイント
  properties.js          プロパティパネル
  io.js                  保存 / 読込 / サンプル
  toolbar.js             ツールバー
.github/workflows/
  pages.yml              GitHub Actions デプロイ
```

- **Vanilla JS** (ES5 / var 宣言 / IIFE パターン / `window.Machinations` 名前空間)
- **SVG ベース**のレンダリング -- 外部ライブラリ依存なし
- **GitHub Actions** で GitHub Pages に自動デプロイ

---

## 開発

```bash
# リポジトリをクローン
git clone https://github.com/dsgarage/machinations-web.git
cd machinations-web

# ローカルサーバーを起動して開発
python3 -m http.server 8000

# main ブランチへの push で GitHub Pages に自動デプロイされます
```

---

## ドキュメント

詳細なドキュメントは **[Wiki](https://github.com/dsgarage/machinations-web/wiki)** を参照してください。

---

## 参考文献

> Joris Dormans, *"Engineering Emergence: Applied Theory for Game Design"*, 2012
>
> Machinations フレームワークの理論的基盤と設計パターンについて解説した書籍です。

- [Machinations.io](https://machinations.io/) -- 公式ツール (商用)

---

## ライセンス

[MIT License](LICENSE)
