import type { CSSProperties, ReactNode } from "react";
import {
  useSlidePageNumber,
  type DesignSystem,
  type Page,
  type SlideMeta,
  type SlideTransition,
} from "@open-slide/core";

import referenceView from "./assets/reference-view.png";
import debugModelMissing from "./assets/debug-model-missing.png";
import debugTpose from "./assets/debug-tpose.png";

export const design: DesignSystem = {
  palette: {
    bg: "#0A100C",
    text: "#E9F0E4",
    accent: "#B9F53C",
  },
  fonts: {
    display: '"Microsoft JhengHei", "Noto Sans TC", system-ui, sans-serif',
    body: '"Microsoft JhengHei", "Noto Sans TC", system-ui, sans-serif',
  },
  typeScale: {
    hero: 150,
    body: 34,
  },
  radius: 10,
};

const color = {
  panel: "rgba(18, 29, 21, 0.92)",
  panelSoft: "rgba(29, 43, 31, 0.72)",
  muted: "#9BA99B",
  line: "rgba(185, 245, 60, 0.28)",
  cyan: "#78DCCA",
  danger: "#FF674D",
  amber: "#F6B84A",
  white: "#F6F8F1",
  black: "#050806",
};

export const transition: SlideTransition = {
  duration: 210,
  exit: {
    duration: 140,
    easing: "cubic-bezier(0.4, 0, 1, 1)",
    keyframes: [
      { opacity: 1, transform: "translateY(0)" },
      { opacity: 0, transform: "translateY(-4px)" },
    ],
  },
  enter: {
    duration: 210,
    delay: 70,
    easing: "cubic-bezier(0, 0, 0.2, 1)",
    keyframes: [
      { opacity: 0, transform: "translateY(7px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
  },
};

const root: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  background: "var(--osd-bg)",
  color: "var(--osd-text)",
  fontFamily: "var(--osd-font-body)",
};

function GridBackdrop() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(185,245,60,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(185,245,60,.045) 1px, transparent 1px)",
          backgroundSize: "68px 68px",
          maskImage: "linear-gradient(to bottom, black, transparent 90%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 36,
          border: `2px solid ${color.line}`,
          boxShadow: "inset 0 0 50px rgba(185,245,60,.04)",
        }}
      />
    </>
  );
}

function Footer({ chapter }: { chapter: string }) {
  const { current, total } = useSlidePageNumber();
  return (
    <div
      style={{
        position: "absolute",
        left: 82,
        right: 82,
        bottom: 54,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        color: color.muted,
        fontSize: 22,
        letterSpacing: "0.08em",
      }}
    >
      <span>{chapter}</span>
      <span>
        {String(current).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </span>
    </div>
  );
}

function Shell({
  children,
  chapter,
  eyebrow,
}: {
  children: ReactNode;
  chapter: string;
  eyebrow?: string;
}) {
  return (
    <section style={root}>
      <GridBackdrop />
      {eyebrow ? (
        <div
          style={{
            position: "absolute",
            left: 92,
            top: 62,
            color: "var(--osd-accent)",
            fontSize: 23,
            fontWeight: 800,
            letterSpacing: "0.18em",
          }}
        >
          {eyebrow}
        </div>
      ) : null}
      {children}
      <Footer chapter={chapter} />
    </section>
  );
}

function Heading({
  children,
  top = 108,
  size = 72,
  width = 1500,
}: {
  children: ReactNode;
  top?: number;
  size?: number;
  width?: number;
}) {
  return (
    <h2
      style={{
        position: "absolute",
        left: 92,
        top,
        width,
        margin: 0,
        fontFamily: "var(--osd-font-display)",
        fontSize: size,
        lineHeight: 1.12,
        fontWeight: 900,
        letterSpacing: "-0.025em",
      }}
    >
      {children}
    </h2>
  );
}

function Card({
  x,
  y,
  w,
  h,
  title,
  children,
  accent = "var(--osd-accent)",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  children: ReactNode;
  accent?: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        padding: "30px 34px",
        background: color.panel,
        border: `1px solid ${color.line}`,
        borderTop: `5px solid ${accent}`,
        borderRadius: "var(--osd-radius)",
      }}
    >
      <div style={{ color: accent, fontSize: 24, fontWeight: 900, letterSpacing: "0.06em" }}>{title}</div>
      <div style={{ marginTop: 18, color: color.white, fontSize: 30, lineHeight: 1.46 }}>{children}</div>
    </div>
  );
}

function Pill({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "red" | "cyan" | "amber" }) {
  const ink =
    tone === "red" ? color.danger : tone === "cyan" ? color.cyan : tone === "amber" ? color.amber : "var(--osd-accent)";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "8px 16px",
        margin: "0 10px 10px 0",
        border: `1px solid ${ink}`,
        borderRadius: 999,
        color: ink,
        fontSize: 23,
        fontWeight: 800,
      }}
    >
      {children}
    </span>
  );
}

function Arrow({ x, y, label }: { x: number; y: number; label?: string }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 100, textAlign: "center" }}>
      <div style={{ color: "var(--osd-accent)", fontSize: 52, lineHeight: 1 }}>→</div>
      {label ? <div style={{ color: color.muted, fontSize: 18 }}>{label}</div> : null}
    </div>
  );
}

function ImageFrame({
  src,
  x,
  y,
  w,
  h,
  caption,
  objectFit = "cover",
}: {
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  caption: string;
  objectFit?: "cover" | "contain";
}) {
  return (
    <figure
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        margin: 0,
        padding: 12,
        background: color.panel,
        border: `1px solid ${color.line}`,
      }}
    >
      <img src={src} style={{ display: "block", width: "100%", height: h, objectFit, background: color.black }} />
      <figcaption style={{ padding: "14px 6px 3px", color: color.muted, fontSize: 22 }}>{caption}</figcaption>
    </figure>
  );
}

const Cover: Page = () => (
  <section style={root}>
    <img
      src={referenceView}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        filter: "saturate(.65) contrast(1.2)",
        transform: "scale(1.04)",
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(90deg, rgba(5,8,6,.97) 0%, rgba(5,8,6,.84) 48%, rgba(5,8,6,.32) 100%), linear-gradient(0deg, rgba(5,8,6,.78), transparent 58%)",
      }}
    />
    <div style={{ position: "absolute", left: 100, top: 92, color: "var(--osd-accent)", fontSize: 25, fontWeight: 900 }}>
      PROTOTYPE DEVELOPMENT REPORT // K-17
    </div>
    <h1
      style={{
        position: "absolute",
        left: 96,
        top: 220,
        width: 980,
        margin: 0,
        fontFamily: "var(--osd-font-display)",
        fontSize: 150,
        lineHeight: 0.98,
        fontWeight: 950,
        letterSpacing: "-0.06em",
      }}
    >
      感染者
      <br />
      <span style={{ color: "var(--osd-accent)" }}>最後防線</span>
    </h1>
    <div style={{ position: "absolute", left: 104, top: 565, width: 960, fontSize: 42, lineHeight: 1.38, color: color.white }}>
      Web 2.5D 俯視射擊遊戲製作實錄
    </div>
    <div style={{ position: "absolute", left: 106, bottom: 92, color: color.muted, fontSize: 25 }}>
      從需求確認、方塊原型，到 GLB 模型與動畫整合
    </div>
  </section>
);

Cover.transition = {
  duration: 280,
  exit: transition.exit,
  enter: {
    duration: 280,
    delay: 90,
    easing: "cubic-bezier(0, 0, 0.2, 1)",
    keyframes: [
      { opacity: 0, transform: "translateY(12px)", filter: "blur(4px)" },
      { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
    ],
  },
};

const Outcome: Page = () => (
  <Shell chapter="MISSION BRIEF" eyebrow="01 / 最終成果">
    <Heading>先定義「完成」，再開始製作</Heading>
    <Card x={92} y={250} w={500} h={490} title="平台">
      PC Chrome
      <br />
      Three.js + Vite
      <br />
      JavaScript
    </Card>
    <Card x={620} y={250} w={570} h={490} title="核心操作" accent={color.cyan}>
      WASD 畫面相對移動
      <br />
      滑鼠自由瞄準
      <br />
      射擊、換彈、翻滾
    </Card>
    <Card x={1218} y={250} w={610} h={490} title="完整單局" accent={color.danger}>
      三個固定戰區
      <br />
      兩次配件三選一
      <br />
      感染者頭目戰
    </Card>
    <div style={{ position: "absolute", left: 96, top: 790, fontSize: 38, color: color.muted }}>
      目標不是做出所有功能，而是做出一場能開始、能結束、能重玩的戰鬥。
    </div>
  </Shell>
);

const Roadmap: Page = () => (
  <Shell chapter="MISSION BRIEF" eyebrow="02 / 製作路線">
    <Heading>把模糊想法，逐步變成可驗收成果</Heading>
    <Card x={92} y={310} w={270} h={280} title="01 確認">
      類型
      <br />
      視角
      <br />
      操作
    </Card>
    <Arrow x={370} y={390} />
    <Card x={468} y={310} w={270} h={280} title="02 企劃" accent={color.cyan}>
      戰鬥循環
      <br />
      關卡
      <br />
      範圍
    </Card>
    <Arrow x={746} y={390} />
    <Card x={844} y={310} w={270} h={280} title="03 方塊">
      視角
      <br />
      手感
      <br />
      流程
    </Card>
    <Arrow x={1122} y={390} />
    <Card x={1220} y={310} w={270} h={280} title="04 模型" accent={color.amber}>
      GLB
      <br />
      骨架
      <br />
      動畫
    </Card>
    <Arrow x={1498} y={390} />
    <Card x={1596} y={310} w={232} h={280} title="05 修正" accent={color.danger}>
      測試
      <br />
      除錯
      <br />
      驗收
    </Card>
    <div style={{ position: "absolute", left: 410, top: 690, width: 1100, textAlign: "center", fontSize: 43, fontWeight: 800 }}>
      每一階段都先回答一個問題，再進入下一階段。
    </div>
  </Shell>
);

const PreProduction: Page = () => (
  <Shell chapter="PRE-PRODUCTION" eyebrow="03 / 前期確認">
    <Heading>開始前，至少確認八件事</Heading>
    <Card x={92} y={245} w={400} h={260} title="遊戲定位">
      類型、核心樂趣
      <br />
      目標平台、單局時間
    </Card>
    <Card x={516} y={245} w={400} h={260} title="視角與操作" accent={color.cyan}>
      相機角度、移動基準
      <br />
      瞄準、射擊、翻滾
    </Card>
    <Card x={940} y={245} w={400} h={260} title="戰鬥內容" accent={color.danger}>
      武器、敵人、頭目
      <br />
      升級與彈藥規則
    </Card>
    <Card x={1364} y={245} w={464} h={260} title="製作限制" accent={color.amber}>
      工具、素材、工期
      <br />
      必做與暫緩項目
    </Card>
    <div style={{ position: "absolute", left: 92, top: 590, width: 1736, padding: 40, boxSizing: "border-box", background: color.panelSoft }}>
      <div style={{ fontSize: 28, color: "var(--osd-accent)", fontWeight: 900 }}>判斷原則</div>
      <div style={{ marginTop: 18, fontSize: 42, lineHeight: 1.45 }}>
        前期不是把所有細節想完，而是避免團隊對「玩法」「操作」「完成範圍」有不同答案。
      </div>
    </div>
  </Shell>
);

const Decisions: Page = () => (
  <Shell chapter="PRE-PRODUCTION" eyebrow="04 / 本案決策">
    <Heading>把關鍵答案寫成一句話</Heading>
    <div style={{ position: "absolute", left: 110, top: 260, width: 1700, fontSize: 44, lineHeight: 1.75 }}>
      <Pill>高位透視 2.5D</Pill>
      <Pill tone="red">現代軍事感染題材</Pill>
      <Pill tone="cyan">WASD 畫面相對移動</Pill>
      <Pill tone="cyan">滑鼠自由瞄準</Pill>
      <Pill>單人固定角色</Pill>
      <Pill tone="amber">突擊步槍</Pill>
      <Pill>三區固定流程</Pill>
      <Pill tone="red">最終頭目戰</Pill>
      <Pill tone="amber">單局約 10 分鐘</Pill>
    </div>
    <div
      style={{
        position: "absolute",
        left: 130,
        right: 130,
        bottom: 160,
        padding: "38px 44px",
        borderLeft: `6px solid ${color.danger}`,
        background: color.panel,
        fontSize: 38,
      }}
    >
      最重要的控制決策：<b>角色移動方向與角色面向彼此獨立。</b>
    </div>
  </Shell>
);

const Planning: Page = () => (
  <Shell chapter="GAME DESIGN" eyebrow="05 / 產出企劃">
    <Heading>企劃要能直接轉成開發清單</Heading>
    <Card x={92} y={250} w={530} h={470} title="戰鬥循環">
      進入戰區
      <br />
      清除感染者
      <br />
      選擇配件
      <br />
      前進下一區
    </Card>
    <Card x={650} y={250} w={530} h={470} title="系統規格" accent={color.cyan}>
      射速、彈匣、換彈
      <br />
      散布、穿透、命中
      <br />
      翻滾無敵與冷卻
    </Card>
    <Card x={1208} y={250} w={620} h={470} title="驗收條件" accent={color.amber}>
      三區可完整通關
      <br />
      勝敗可重新開始
      <br />
      沒有 GLB 也能遊玩
    </Card>
    <div style={{ position: "absolute", left: 95, top: 780, fontSize: 35, color: color.muted }}>
      好企劃不是故事寫得多，而是每一條都能被實作與測試。
    </div>
  </Shell>
);

const Scope: Page = () => (
  <Shell chapter="GAME DESIGN" eyebrow="06 / 確認企劃">
    <Heading>一個上午，只做完整閉環</Heading>
    <Card x={120} y={260} w={760} h={520} title="本版保留" accent="var(--osd-accent)">
      完整射擊手感
      <br />
      三種感染者與頭目
      <br />
      三區流程與兩次升級
      <br />
      方塊／模型雙模式
      <br />
      勝敗與重開
    </Card>
    <Card x={1040} y={260} w={760} h={520} title="本版暫緩" accent={color.danger}>
      多人連線與配對
      <br />
      隨機地圖與永久成長
      <br />
      正式劇情與存檔
      <br />
      完整動畫狀態機
      <br />
      大量武器與技能
    </Card>
    <div style={{ position: "absolute", left: 840, top: 470, fontSize: 72, color: color.muted }}>VS</div>
  </Shell>
);

const WhyGraybox: Page = () => (
  <Shell chapter="GRAYBOX PROTOTYPE" eyebrow="07 / 方塊圖">
    <Heading>模型還沒準備好，也要先確認好不好玩</Heading>
    <ImageFrame src={referenceView} x={92} y={250} w={860} h={480} caption="視角參考：高位透視、角色置中、戰場資訊清楚" />
    <Card x={1020} y={250} w={808} h={480} title="方塊原型先回答">
      1. 視角能不能看清敵人？
      <br />
      2. 移動與瞄準是否直覺？
      <br />
      3. 射擊、翻滾是否有節奏？
      <br />
      4. 關卡流程是否能完整結束？
    </Card>
    <div style={{ position: "absolute", left: 1040, top: 780, fontSize: 34, color: color.muted }}>
      美術延後，玩法風險先處理。
    </div>
  </Shell>
);

const GrayboxArchitecture: Page = () => (
  <Shell chapter="GRAYBOX PROTOTYPE" eyebrow="08 / 架構">
    <Heading>外層實體管玩法，visualRoot 只管外觀</Heading>
    <Card x={140} y={285} w={490} h={410} title="ENTITY / 實體">
      位置與旋轉
      <br />
      生命與攻擊
      <br />
      移動與碰撞
      <br />
      AI 狀態
    </Card>
    <Arrow x={690} y={425} label="掛載" />
    <Card x={850} y={285} w={420} h={410} title="visualRoot" accent={color.cyan}>
      方塊示意
      <br />
      或
      <br />
      GLB 模型
    </Card>
    <Arrow x={1330} y={425} label="切換" />
    <Card x={1490} y={285} w={300} h={410} title="結果" accent={color.amber}>
      外觀替換
      <br />
      玩法不變
    </Card>
    <div style={{ position: "absolute", left: 220, top: 770, width: 1480, textAlign: "center", fontSize: 39 }}>
      碰撞箱永遠獨立於模型，避免美術尺寸改變遊戲規則。
    </div>
  </Shell>
);

const GrayboxQA: Page = () => (
  <Shell chapter="GRAYBOX PROTOTYPE" eyebrow="09 / 玩法驗收">
    <Heading>方塊版本通過後，才允許換模型</Heading>
    <Card x={92} y={250} w={530} h={470} title="操作">
      □ WASD 對應畫面方向
      <br />
      □ 滑鼠可 360° 瞄準
      <br />
      □ 翻滾與換彈正常
    </Card>
    <Card x={650} y={250} w={530} h={470} title="戰鬥" accent={color.danger}>
      □ 子彈命中與穿透
      <br />
      □ 敵人追擊與攻擊
      <br />
      □ 障礙碰撞一致
    </Card>
    <Card x={1208} y={250} w={620} h={470} title="流程" accent={color.amber}>
      □ 三區依序開啟
      <br />
      □ 兩次升級選擇
      <br />
      □ 頭目、勝敗、重開
    </Card>
    <div style={{ position: "absolute", left: 92, top: 790, fontSize: 36, color: "var(--osd-accent)", fontWeight: 900 }}>
      驗收原則：沒有任何 GLB 時，仍能從首頁玩到結算。
    </div>
  </Shell>
);

const AssetSources: Page = () => (
  <Shell chapter="ASSET PIPELINE" eyebrow="10 / 尋找模型">
    <Heading>搜尋模型時，先看授權，再看外觀</Heading>
    <Card x={92} y={240} w={520} h={500} title="主要來源：Sketchfab">
      本專案角色模型來源
      <br />
      可搜尋 downloadable
      <br />
      需確認 CC 授權與署名
      <br />
      sketchfab.com
    </Card>
    <Card x={640} y={240} w={560} h={500} title="骨架與動畫" accent={color.cyan}>
      Mixamo
      <br />
      自動綁定人形骨架
      <br />
      提供走路、跑步、戰鬥動作
      <br />
      mixamo.com
    </Card>
    <Card x={1228} y={240} w={600} h={500} title="其他參考" accent={color.amber}>
      Kenney：原型與低多邊形
      <br />
      itch.io：角色與素材包
      <br />
      Fab / CGTrader / TurboSquid
      <br />
      OpenGameArt
    </Card>
    <div style={{ position: "absolute", left: 95, top: 795, fontSize: 31, color: color.muted }}>
      下載前檢查：可否商用、是否需署名、能否修改、是否含骨架／動畫／貼圖。
    </div>
  </Shell>
);

const FolderContract: Page = () => (
  <Shell chapter="ASSET PIPELINE" eyebrow="11 / GLB 規格">
    <Heading>固定命名，讓替換模型變成「放入資料夾」</Heading>
    <Card x={100} y={245} w={760} h={560} title="public/assets/models/">
      <span style={{ color: color.cyan }}>characters/</span>
      <br />
      ├─ player.glb
      <br />
      ├─ infected.glb
      <br />
      ├─ infected_heavy.glb
      <br />
      └─ boss.glb
    </Card>
    <Card x={930} y={245} w={800} h={560} title="同一份集中清單" accent={color.amber}>
      <span style={{ color: color.cyan }}>weapons/</span> assault_rifle.glb
      <br />
      <span style={{ color: color.cyan }}>environment/</span>
      <br />
      ground.glb
      <br />
      barrier.glb
      <br />
      arena_props.glb
      <br />
      <span style={{ color: "var(--osd-accent)" }}>失敗時自動回退方塊</span>
    </Card>
  </Shell>
);

const ModelNormalization: Page = () => (
  <Shell chapter="ASSET PIPELINE" eyebrow="12 / 模型正規化">
    <Heading>「載入成功」不等於「畫面看得到」</Heading>
    <ImageFrame
      src={debugModelMissing}
      x={92}
      y={240}
      w={800}
      h={510}
      caption="實際問題：槍械已出現，但角色模型因骨架、縮放或原點而不可見"
    />
    <Card x={960} y={240} w={868} h={510} title="處理順序" accent={color.cyan}>
      1. 用 SkeletonUtils 複製骨架
      <br />
      2. 讀取 Bounding Box
      <br />
      3. 將腳底移到原點
      <br />
      4. 統一朝向與比例
      <br />
      5. 依角色類型套用偏移
    </Card>
    <div style={{ position: "absolute", left: 1000, top: 795, fontSize: 31, color: color.muted }}>
      常見差異：1 unit = 1 meter，或模型以公分輸出。
    </div>
  </Shell>
);

const AnimationEvolution: Page = () => (
  <Shell chapter="ANIMATION" eyebrow="13 / 角色動畫演進">
    <Heading>不要一次做完動畫，逐步提升可信度</Heading>
    <ImageFrame src={debugTpose} x={92} y={250} w={640} h={485} caption="初始狀態：模型成功顯示，但停留在張手姿勢" />
    <Card x={780} y={250} w={250} h={360} title="STEP 1">
      站姿
      <br />
      定格
    </Card>
    <Arrow x={1040} y={385} />
    <Card x={1140} y={250} w={250} h={360} title="STEP 2" accent={color.amber}>
      持槍
      <br />
      走路定格
    </Card>
    <Arrow x={1400} y={385} />
    <Card x={1500} y={250} w={300} h={360} title="STEP 3" accent="var(--osd-accent)">
      移動時
      <br />
      真正播放
    </Card>
    <div style={{ position: "absolute", left: 800, top: 680, width: 1000, fontSize: 35, lineHeight: 1.5, color: color.muted }}>
      停止時回到持槍姿勢；移動時啟動 AnimationMixer，並將角色速度由 7.5 調為 4.4，使步頻與位移一致。
    </div>
  </Shell>
);

const Backpedal: Page = () => (
  <Shell chapter="ANIMATION" eyebrow="14 / 後退動畫">
    <Heading>S 鍵不是轉身，而是持槍後退</Heading>
    <Card x={120} y={270} w={520} h={430} title="判斷">
      移動向量
      <br />
      ·
      <br />
      角色面向向量
      <br />
      <span style={{ color: color.danger }}>dot &lt; 0</span>
    </Card>
    <Arrow x={700} y={410} label="反方向" />
    <Card x={860} y={270} w={420} h={430} title="動畫" accent={color.cyan}>
      action.timeScale
      <br />
      =
      <br />
      -timeScale
    </Card>
    <Arrow x={1340} y={410} />
    <Card x={1500} y={270} w={300} h={430} title="結果" accent="var(--osd-accent)">
      面向滑鼠
      <br />
      腳步倒放
      <br />
      自然後退
    </Card>
    <div style={{ position: "absolute", left: 220, top: 780, width: 1480, textAlign: "center", fontSize: 36, color: color.muted }}>
      同時移除動畫的 root motion，遊戲實體與碰撞箱才是唯一位置來源。
    </div>
  </Shell>
);

const WasdBug: Page = () => (
  <Shell chapter="BUG FIX" eyebrow="15 / BUG：WASD 方向">
    <Heading>A、D 為什麼會顛倒？</Heading>
    <Card x={100} y={250} w={480} h={480} title="錯誤做法" accent={color.danger}>
      依角色面向
      <br />
      或世界座標
      <br />
      直接計算移動
      <br />
      <span style={{ color: color.danger }}>畫面左 ≠ 世界 -X</span>
    </Card>
    <Arrow x={630} y={410} label="改為" />
    <Card x={790} y={250} w={500} h={480} title="正確基準" accent={color.cyan}>
      W = 畫面上
      <br />
      S = 畫面下
      <br />
      A = 畫面左
      <br />
      D = 畫面右
    </Card>
    <Arrow x={1340} y={410} />
    <Card x={1500} y={250} w={300} h={480} title="獨立瞄準">
      滑鼠射線
      <br />
      投射地面
      <br />
      角色朝向
      <br />
      命中點
    </Card>
    <div style={{ position: "absolute", left: 100, top: 790, fontSize: 34, color: color.muted }}>
      修正重點不是交換按鍵文字，而是以相機投影後的畫面方向重新定義 X／Z。
    </div>
  </Shell>
);

const ShootingBug: Page = () => (
  <Shell chapter="BUG FIX" eyebrow="16 / BUG：槍口與彈道">
    <Heading>射線正確，起點錯了，畫面仍然會穿模</Heading>
    <Card x={92} y={250} w={530} h={490} title="槍口錯位" accent={color.danger}>
      問題：
      <br />
      模型槍口與程式 anchor 不同
      <br />
      <br />
      解法：
      <br />
      從槍械節點／骨骼建立 muzzleAnchor
    </Card>
    <Card x={650} y={250} w={530} h={490} title="穿過玩家" accent={color.amber}>
      問題：
      <br />
      射線從角色中心開始
      <br />
      <br />
      解法：
      <br />
      起點前推至碰撞半徑之外
    </Card>
    <Card x={1208} y={250} w={620} h={490} title="穿過障礙" accent={color.cyan}>
      問題：
      <br />
      只檢查敵人交點
      <br />
      <br />
      解法：
      <br />
      先算最近牆距，再限制 raycaster.far
    </Card>
  </Shell>
);

const Loading: Page = () => (
  <Shell chapter="BUG FIX" eyebrow="17 / BUG：Loading 閃頻">
    <Heading>所有素材準備好，再一次揭開遊戲</Heading>
    <Card x={92} y={300} w={270} h={300} title="1">
      內嵌
      <br />
      Boot Overlay
    </Card>
    <Arrow x={370} y={390} />
    <Card x={468} y={300} w={270} h={300} title="2" accent={color.cyan}>
      預載
      <br />
      全部 GLB
    </Card>
    <Arrow x={746} y={390} />
    <Card x={844} y={300} w={270} h={300} title="3" accent={color.amber}>
      等待 CSS
      <br />
      字型與 Load
    </Card>
    <Arrow x={1122} y={390} />
    <Card x={1220} y={300} w={270} h={300} title="4" accent={color.cyan}>
      渲染第一個
      <br />
      WebGL Frame
    </Card>
    <Arrow x={1498} y={390} />
    <Card x={1596} y={300} w={232} h={300} title="5">
      bootComplete
      <br />
      顯示首頁
    </Card>
    <div style={{ position: "absolute", left: 280, top: 700, width: 1360, textAlign: "center", fontSize: 39 }}>
      模型載入失敗只顯示警告，方塊 fallback 仍可讓遊戲開始。
    </div>
  </Shell>
);

const EnvironmentBug: Page = () => (
  <Shell chapter="BUG FIX" eyebrow="18 / BUG：場景模型">
    <Heading>視覺模型與碰撞規則，必須分開處理</Heading>
    <Card x={92} y={250} w={530} h={500} title="Ground 太小" accent={color.danger}>
      原模型不是平坦地面比例
      <br />
      強行撐滿會嚴重失真
      <br />
      <br />
      <b>處理：</b>
      <br />
      停用 Ground GLB
      <br />
      保留程式生成地板
    </Card>
    <Card x={650} y={250} w={530} h={500} title="Barrier 不一致" accent={color.amber}>
      視覺尺寸與碰撞箱不吻合
      <br />
      看似有牆卻能穿過
      <br />
      <br />
      <b>處理：</b>
      <br />
      依每面牆的 width / height / depth
      <br />
      個別 fitTo
    </Card>
    <Card x={1208} y={250} w={620} h={500} title="可切換模式" accent={color.cyan}>
      首頁新增一鍵切換
      <br />
      方塊示意 ↔ 3D 模型
      <br />
      <br />
      只切換 visualRoot
      <br />
      碰撞、生命、AI 完全不變
    </Card>
  </Shell>
);

const NavigationBug: Page = () => (
  <Shell chapter="BUG FIX" eyebrow="19 / BUG：怪物卡牆">
    <Heading>追不到玩家時，不要持續往牆裡走</Heading>
    <Card x={92} y={275} w={330} h={390} title="直線">
      嘗試朝玩家
      <br />
      前進
    </Card>
    <Arrow x={430} y={410} label="受阻" />
    <Card x={540} y={275} w={330} h={390} title="斜向" accent={color.cyan}>
      嘗試
      <br />
      ±45°
    </Card>
    <Arrow x={878} y={410} label="仍受阻" />
    <Card x={988} y={275} w={330} h={390} title="側向" accent={color.amber}>
      嘗試
      <br />
      ±90°
    </Card>
    <Arrow x={1326} y={410} label="持續卡住" />
    <Card x={1436} y={275} w={392} h={390} title="換邊" accent={color.danger}>
      stuck timer
      <br />
      反轉 navSide
      <br />
      重新繞行
    </Card>
    <div style={{ position: "absolute", left: 150, top: 750, width: 1620, textAlign: "center", fontSize: 34, color: color.muted }}>
      X／Z 分軸檢查；怪物互相推擠前也先 canMove，避免被同伴推進牆內。
    </div>
  </Shell>
);

const DebugMethod: Page = () => (
  <Shell chapter="QUALITY ASSURANCE" eyebrow="20 / 除錯方法">
    <Heading>把「看起來怪怪的」轉成可量測訊號</Heading>
    <Card x={92} y={250} w={530} h={500} title="先隔離">
      指定房間快速測試
      <br />
      方塊／模型模式切換
      <br />
      只載入單一角色
      <br />
      暫停其他系統干擾
    </Card>
    <Card x={650} y={250} w={530} h={500} title="再量測" accent={color.cyan}>
      Bounding Box 尺寸
      <br />
      動畫 clip 名稱
      <br />
      模型原點與朝向
      <br />
      射線最近交點
    </Card>
    <Card x={1208} y={250} w={620} h={500} title="最後回歸" accent={color.amber}>
      射擊、受傷、碰撞
      <br />
      翻滾、導航、換彈
      <br />
      三區流程與頭目
      <br />
      無 GLB fallback
    </Card>
  </Shell>
);

const Closing: Page = () => (
  <Shell chapter="DEBRIEF" eyebrow="21 / 結論">
    <Heading top={125} size={84}>從方塊開始，讓每次進步都可驗證</Heading>
    <div style={{ position: "absolute", left: 120, top: 310, width: 1680, display: "flex", alignItems: "center", gap: 46 }}>
      <div style={{ width: 420, fontSize: 92, fontWeight: 950, color: "var(--osd-accent)", lineHeight: 1.05 }}>
        先玩法
      </div>
      <div style={{ fontSize: 70, color: color.muted }}>→</div>
      <div style={{ width: 420, fontSize: 92, fontWeight: 950, color: color.cyan, lineHeight: 1.05 }}>
        再模型
      </div>
      <div style={{ fontSize: 70, color: color.muted }}>→</div>
      <div style={{ width: 470, fontSize: 92, fontWeight: 950, color: color.danger, lineHeight: 1.05 }}>
        最後細修
      </div>
    </div>
    <div
      style={{
        position: "absolute",
        left: 180,
        right: 180,
        top: 590,
        padding: "45px 55px",
        background: color.panel,
        border: `1px solid ${color.line}`,
        fontSize: 39,
        lineHeight: 1.55,
        textAlign: "center",
      }}
    >
      最可靠的開發流程，是讓方塊版本、模型版本與最終版本
      <br />
      都能獨立通過同一套玩法驗收。
    </div>
  </Shell>
);

export const meta: SlideMeta = {
  title: "感染者 最後防線：Web 2.5D 俯視射擊遊戲製作實錄",
  createdAt: "2026-06-11T08:50:05.031Z",
};

export default [
  Cover,
  Outcome,
  Roadmap,
  PreProduction,
  Decisions,
  Planning,
  Scope,
  WhyGraybox,
  GrayboxArchitecture,
  GrayboxQA,
  AssetSources,
  FolderContract,
  ModelNormalization,
  AnimationEvolution,
  Backpedal,
  WasdBug,
  ShootingBug,
  Loading,
  EnvironmentBug,
  NavigationBug,
  DebugMethod,
  Closing,
] satisfies Page[];
