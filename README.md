# 感染者 最後防線

以 Three.js、Vite 與 JavaScript 製作的 Web 2.5D 俯視射擊遊戲原型。

## 線上展示

- 遊戲：<https://yuchehsieh.github.io/2.5D-Game/>
- 製作教學簡報：<https://yuchehsieh.github.io/2.5D-Game/presentation/infected-last-defense.html>

## 操作

- `WASD`：依畫面方向移動
- 滑鼠：自由瞄準
- 滑鼠左鍵：射擊
- `R`：換彈
- `Space`：翻滾

## 本機開發

```powershell
npm.cmd install
npm.cmd run dev
```

遊戲預設位於 <http://127.0.0.1:5173/>。

### 簡報

```powershell
cd presentation
npm.cmd install
npm.cmd run dev
```

### 建置完整網站

```powershell
npm.cmd run build:site
```

遊戲與唯讀簡報會輸出到 `dist/`。推送至 `main` 後，GitHub Actions 會自動建置並部署 GitHub Pages。

## 素材與用途

本專案為非商業教學展示。角色與場景 GLB 來自 Sketchfab，詳細作者、來源與授權請見 [THIRD_PARTY_ASSETS.md](THIRD_PARTY_ASSETS.md)。

玩家、普通感染者與重型感染者採用 `CC BY-NC 4.0` 模型，不得用於商業用途。若未來將本專案商業化，必須先替換這三個模型。
