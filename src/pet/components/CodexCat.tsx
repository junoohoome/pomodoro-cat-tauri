import { useMemo } from "react";

type CatMood = "idle" | "running" | "paused" | "break";

interface CodexCatProps {
  mood: CatMood;
  size?: number;
  /** 精灵图模式：SVG 预渲染为光栅图，动画应用到 HTML 容器，大幅降低 CPU */
  useSprite?: boolean;
}

/* ─── 精灵图：预定义 SVG 字符串，按 mood 生成 data URL ─── */

const BODY = `
<ellipse cx="49" cy="84" rx="25" ry="6" fill="rgba(43,30,25,0.18)"/>
<path d="M67 59C81 56 82 42 74 39C68 37 65 42 69 47C72 51 69 55 62 57" stroke="#5B352A" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M25 76C19 72 17 62 20 51C23 39 33 31 47 31C61 31 73 40 76 53C78 63 75 72 69 76H25Z" fill="#F2A65E" stroke="#5B352A" stroke-width="4" stroke-linejoin="round"/>
<path d="M30 76C27 66 31 55 40 51C48 48 59 52 65 76H30Z" fill="#FFD48D" opacity="0.92"/>
<path d="M23 39L18 18L35 29" fill="#F2A65E" stroke="#5B352A" stroke-width="4" stroke-linejoin="round"/>
<path d="M72 39L78 18L60 29" fill="#F2A65E" stroke="#5B352A" stroke-width="4" stroke-linejoin="round"/>
<path d="M24 27L22 20L30 28" fill="#FFCFD0"/>
<path d="M72 27L75 20L66 28" fill="#FFCFD0"/>
<path d="M20 45C20 31 32 21 48 21C64 21 76 31 76 45C76 59 64 68 48 68C32 68 20 59 20 45Z" fill="#F7B86E" stroke="#5B352A" stroke-width="4"/>
<path d="M30 48C30 40 37 34 48 34C59 34 66 40 66 48C66 57 59 62 48 62C37 62 30 57 30 48Z" fill="#FFE0A6"/>
<path d="M27 39H20V33H27V39Z" fill="#FFE2A8" opacity="0.72"/>
<path d="M76 41H69V35H76V41Z" fill="#D97D4A" opacity="0.42"/>
<path d="M35 25H42V31H35V25Z" fill="#FFD48D" opacity="0.72"/>`;

const FACE: Record<CatMood, string> = {
  idle: `<rect x="35" y="41" width="8" height="8" rx="3" fill="#3B241E"/><rect x="53" y="41" width="8" height="8" rx="3" fill="#3B241E"/><rect x="38" y="43" width="2" height="2" fill="#FFF"/><rect x="56" y="43" width="2" height="2" fill="#FFF"/>`,
  running: `<path d="M34 44C38 40 42 40 45 44" stroke="#5B352A" stroke-width="3" stroke-linecap="round"/><path d="M51 44C55 40 59 40 62 44" stroke="#5B352A" stroke-width="3" stroke-linecap="round"/>`,
  paused: `<path d="M35 45C38 43 41 43 44 45" stroke="#5B352A" stroke-width="3" stroke-linecap="round"/><path d="M52 45C55 43 58 43 61 45" stroke="#5B352A" stroke-width="3" stroke-linecap="round"/>`,
  break: `<circle cx="39" cy="44" r="4" fill="#3B241E"/><circle cx="57" cy="44" r="4" fill="#3B241E"/><rect x="40" y="42" width="2" height="2" fill="#FFF"/><rect x="58" y="42" width="2" height="2" fill="#FFF"/>`,
};

const MOUTH = (isBreak: boolean) =>
  `<path d="M46 50H50L48 53L46 50Z" fill="#A64A42"/><path d="${isBreak ? "M42 55C45 59 51 59 54 55" : "M44 56C46 58 50 58 52 56"}" stroke="#5B352A" stroke-width="2.2" stroke-linecap="round"/>`;

const LIMBS = `
<path d="M29 52H18" stroke="#5B352A" stroke-width="2" stroke-linecap="round"/>
<path d="M29 56H19" stroke="#5B352A" stroke-width="2" stroke-linecap="round"/>
<path d="M67 52H78" stroke="#5B352A" stroke-width="2" stroke-linecap="round"/>
<path d="M67 56H77" stroke="#5B352A" stroke-width="2" stroke-linecap="round"/>
<path d="M32 77V70" stroke="#5B352A" stroke-width="4" stroke-linecap="round"/>
<path d="M64 77V70" stroke="#5B352A" stroke-width="4" stroke-linecap="round"/>
<path d="M40 78H30" stroke="#5B352A" stroke-width="4" stroke-linecap="round"/>
<path d="M66 78H56" stroke="#5B352A" stroke-width="4" stroke-linecap="round"/>`;

const ACCESSORY: Record<CatMood, string> = {
  idle: "",
  running: `<circle cx="70" cy="70" r="7" fill="#FF6B6B" stroke="#5B352A" stroke-width="3"/><path d="M68 64C69 61 72 60 75 61" stroke="#51CF66" stroke-width="3" stroke-linecap="round"/>`,
  paused: `<path d="M67 23H77L68 33H78" stroke="#8B7A73" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M78 12H86L79 20H87" stroke="#A5948D" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  break: `<path d="M19 24V32" stroke="#FFD166" stroke-width="3" stroke-linecap="round"/><path d="M15 28H23" stroke="#FFD166" stroke-width="3" stroke-linecap="round"/><path d="M80 55V62" stroke="#FFD166" stroke-width="3" stroke-linecap="round"/><path d="M76 58H84" stroke="#FFD166" stroke-width="3" stroke-linecap="round"/>`,
};

function buildCatSVG(mood: CatMood): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none">${BODY}${FACE[mood]}${MOUTH(mood === "break")}${LIMBS}${ACCESSORY[mood]}</svg>`;
}

/** 精灵图模式：预渲染 SVG 为 data URL，动画应用到 HTML 容器 */
function SpriteCat({ mood, size }: { mood: CatMood; size: number }) {
  const src = useMemo(
    () => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildCatSVG(mood))}`,
    [mood],
  );

  return (
    <div
      className={`codex-cat codex-cat-${mood}`}
      style={{ width: size, height: size, position: "relative", overflow: "visible" }}
    >
      <div className="codex-cat-float" style={{ width: "100%", height: "100%" }}>
        <img
          src={src}
          width={size}
          height={size}
          draggable={false}
          alt=""
          style={{ display: "block" }}
        />
      </div>
    </div>
  );
}

/* ─── 原始 SVG 模式（主窗口 Timer/Cat 页面使用） ─── */

export default function CodexCat({ mood, size = 142, useSprite = false }: CodexCatProps) {
  const isRunning = mood === "running";
  const isPaused = mood === "paused";
  const isBreak = mood === "break";

  // 精灵图模式：宠物窗口专用
  if (useSprite) return <SpriteCat mood={mood} size={size} />;

  // 原始 SVG 模式
  return (
    <svg
      className={`codex-cat codex-cat-${mood}`}
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <ellipse cx="49" cy="84" rx="25" ry="6" fill="rgba(43, 30, 25, 0.18)" />

      <g className="codex-cat-float">
        <path
          className="codex-cat-tail"
          d="M67 59C81 56 82 42 74 39C68 37 65 42 69 47C72 51 69 55 62 57"
          stroke="#5B352A"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M25 76C19 72 17 62 20 51C23 39 33 31 47 31C61 31 73 40 76 53C78 63 75 72 69 76H25Z"
          fill="#F2A65E"
          stroke="#5B352A"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M30 76C27 66 31 55 40 51C48 48 59 52 65 76H30Z"
          fill="#FFD48D"
          opacity="0.92"
        />

        <path
          d="M23 39L18 18L35 29"
          fill="#F2A65E"
          stroke="#5B352A"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M72 39L78 18L60 29"
          fill="#F2A65E"
          stroke="#5B352A"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path d="M24 27L22 20L30 28" fill="#FFCFD0" />
        <path d="M72 27L75 20L66 28" fill="#FFCFD0" />

        <path
          d="M20 45C20 31 32 21 48 21C64 21 76 31 76 45C76 59 64 68 48 68C32 68 20 59 20 45Z"
          fill="#F7B86E"
          stroke="#5B352A"
          strokeWidth="4"
        />
        <path
          d="M30 48C30 40 37 34 48 34C59 34 66 40 66 48C66 57 59 62 48 62C37 62 30 57 30 48Z"
          fill="#FFE0A6"
        />

        <path d="M27 39H20V33H27V39Z" fill="#FFE2A8" opacity="0.72" />
        <path d="M76 41H69V35H76V41Z" fill="#D97D4A" opacity="0.42" />
        <path d="M35 25H42V31H35V25Z" fill="#FFD48D" opacity="0.72" />

        {isPaused ? (
          <>
            <path d="M35 45C38 43 41 43 44 45" stroke="#5B352A" strokeWidth="3" strokeLinecap="round" />
            <path d="M52 45C55 43 58 43 61 45" stroke="#5B352A" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : isBreak ? (
          <>
            <circle cx="39" cy="44" r="4" fill="#3B241E" />
            <circle cx="57" cy="44" r="4" fill="#3B241E" />
            <rect x="40" y="42" width="2" height="2" fill="#FFFFFF" />
            <rect x="58" y="42" width="2" height="2" fill="#FFFFFF" />
          </>
        ) : isRunning ? (
          <>
            <path d="M34 44C38 40 42 40 45 44" stroke="#5B352A" strokeWidth="3" strokeLinecap="round" />
            <path d="M51 44C55 40 59 40 62 44" stroke="#5B352A" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : (
          <>
            <rect x="35" y="41" width="8" height="8" rx="3" fill="#3B241E" />
            <rect x="53" y="41" width="8" height="8" rx="3" fill="#3B241E" />
            <rect x="38" y="43" width="2" height="2" fill="#FFFFFF" />
            <rect x="56" y="43" width="2" height="2" fill="#FFFFFF" />
          </>
        )}

        <path d="M46 50H50L48 53L46 50Z" fill="#A64A42" />
        <path
          d={isBreak ? "M42 55C45 59 51 59 54 55" : "M44 56C46 58 50 58 52 56"}
          stroke="#5B352A"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        <path d="M29 52H18" stroke="#5B352A" strokeWidth="2" strokeLinecap="round" />
        <path d="M29 56H19" stroke="#5B352A" strokeWidth="2" strokeLinecap="round" />
        <path d="M67 52H78" stroke="#5B352A" strokeWidth="2" strokeLinecap="round" />
        <path d="M67 56H77" stroke="#5B352A" strokeWidth="2" strokeLinecap="round" />

        <path d="M32 77V70" stroke="#5B352A" strokeWidth="4" strokeLinecap="round" />
        <path d="M64 77V70" stroke="#5B352A" strokeWidth="4" strokeLinecap="round" />
        <path d="M40 78H30" stroke="#5B352A" strokeWidth="4" strokeLinecap="round" />
        <path d="M66 78H56" stroke="#5B352A" strokeWidth="4" strokeLinecap="round" />

        {isRunning && (
          <g className="codex-cat-focus">
            <circle cx="70" cy="70" r="7" fill="#FF6B6B" stroke="#5B352A" strokeWidth="3" />
            <path d="M68 64C69 61 72 60 75 61" stroke="#51CF66" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}

        {isPaused && (
          <g className="codex-cat-zzz">
            <path d="M67 23H77L68 33H78" stroke="#8B7A73" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M78 12H86L79 20H87" stroke="#A5948D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}

        {isBreak && (
          <g className="codex-cat-sparkles">
            <path d="M19 24V32" stroke="#FFD166" strokeWidth="3" strokeLinecap="round" />
            <path d="M15 28H23" stroke="#FFD166" strokeWidth="3" strokeLinecap="round" />
            <path d="M80 55V62" stroke="#FFD166" strokeWidth="3" strokeLinecap="round" />
            <path d="M76 58H84" stroke="#FFD166" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}
      </g>
    </svg>
  );
}
