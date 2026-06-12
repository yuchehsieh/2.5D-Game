# GLB 模型放置位置

把模型放到以下路徑，重新整理網頁後會自動嘗試替換方塊外觀：

```text
public/assets/models/
├── characters/
│   ├── player.glb
│   ├── infected.glb
│   ├── infected_heavy.glb
│   └── boss.glb
├── weapons/
│   └── assault_rifle.glb
└── environment/
    ├── ground.glb
    ├── barrier.glb
    └── arena_props.glb
```

- 預設面向 `+Z`
- 腳底或物件底部位於原點 `(0, 0, 0)`
- 比例為 `1 unit = 1 meter`
- 場景模型只替換外觀，碰撞仍由遊戲中的方塊負責
- 若方向、比例或位置不合，可調整 `src/model-config.js`
- 模型不存在或載入失敗時，遊戲會保留原本的方塊模型
