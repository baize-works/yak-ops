import {Col, Row} from "antd";
import React, {CSSProperties, forwardRef, useEffect, useMemo, useRef, useState,} from "react";
import "./index.less";
import LoginPanel from "./LoginPanel";
import SceneCopy from "./SceneCopy";

/** ===================== Base Layout (unscaled design values) ===================== */
const BASE_LAYOUT = {
  absLeft: {orange: 34, blue: 150, black: 280, yellow: 360} as const,
  absBottom: {orange: 18, blue: 18, black: 22, yellow: 18} as const,
};

/** ===================== Types ===================== */
type Pt = { x: number; y: number };

type ActionType =
  | "BLINK"
  | "SMILE"
  | "SURPRISE"
  | "TILT"
  | "SHAKE"
  | "BOW"
  | "THANKS";

type GlobalAction = { type: ActionType; nonce: number };
type Expression = "idle" | "smile" | "surprise";
type Variant = "orange" | "blue" | "black" | "yellow";
type EntryMode = "bottomBounce" | "topDrop" | "sideSlide";
type FocusedField = "userName" | "userPassword" | null;

type CharacterSpec = {
  w: number;
  h: number;
  bg: string;
  radius: number;

  faceTop: number;
  eyeGap: number;
  eyeSize: number;
  pupilSize: number;
  pupilMaxR: number;
  mouthTop: number;

  tiltMul: number;
  shakeMul: number;
  bowMul: number;

  shape: "rect" | "pill" | "semiTop";

  actionDelayBaseMs: number;
  actionAmp: number;
};

/** ===================== Base Specs (unscaled) ===================== */
const BASE_SPECS: Record<Variant, CharacterSpec> = {
  orange: {
    w: 190,
    h: 110,
    bg: "#FF8B2B",
    radius: 999,
    faceTop: 34,
    eyeGap: 18,
    eyeSize: 18,
    pupilSize: 7,
    pupilMaxR: 5,
    mouthTop: 70,
    tiltMul: 0.75,
    shakeMul: 0.85,
    bowMul: 0.55,
    shape: "semiTop",
    actionDelayBaseMs: 0,
    actionAmp: 0.95,
  },
  blue: {
    w: 150,
    h: 330,
    bg: "#5B3BFF",
    radius: 12,
    faceTop: 42,
    eyeGap: 18,
    eyeSize: 18,
    pupilSize: 7,
    pupilMaxR: 5,
    mouthTop: 86,
    tiltMul: 1.0,
    shakeMul: 1.0,
    bowMul: 1.0,
    shape: "rect",
    actionDelayBaseMs: 30,
    actionAmp: 1.0,
  },
  black: {
    w: 94,
    h: 235,
    bg: "#14161C",
    radius: 12,
    faceTop: 38,
    eyeGap: 16,
    eyeSize: 16,
    pupilSize: 6,
    pupilMaxR: 4,
    mouthTop: 78,
    tiltMul: 0.9,
    shakeMul: 1.15,
    bowMul: 0.9,
    shape: "rect",
    actionDelayBaseMs: 55,
    actionAmp: 1.1,
  },
  yellow: {
    w: 110,
    h: 185,
    bg: "#FFD33D",
    radius: 999,
    faceTop: 48,
    eyeGap: 18,
    eyeSize: 18,
    pupilSize: 7,
    pupilMaxR: 5,
    mouthTop: 92,
    tiltMul: 0.9,
    shakeMul: 0.95,
    bowMul: 0.95,
    shape: "pill",
    actionDelayBaseMs: 15,
    actionAmp: 0.98,
  },
};

/** ===================== Base Entry Config ===================== */
const BASE_ENTRY: Record<Variant,
  { mode: EntryMode; delayMs: number; dist?: number }> = {
  orange: {mode: "bottomBounce", delayMs: 0, dist: 220},
  blue: {mode: "bottomBounce", delayMs: 80, dist: 240},
  black: {mode: "topDrop", delayMs: 160, dist: 220},
  yellow: {mode: "sideSlide", delayMs: 240, dist: 260},
};

/** ===================== Utils ===================== */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function smooth01(t: number) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function bounceOut(t: number) {
  let x = clamp(t, 0, 1);
  const n1 = 7.5625;
  const d1 = 2.75;

  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
}

function vecToPupilOffset(from: Pt, to: Pt, maxR: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;

  return {x: ux * maxR, y: uy * maxR};
}

function getCenter(el: HTMLElement | null): Pt | null {
  if (!el) return null;

  const r = el.getBoundingClientRect();

  return {
    x: r.left + r.width / 2,
    y: r.top + r.height / 2,
  };
}

function hash01(nonce: number, key: string) {
  let h = 2166136261;
  const s = `${nonce}:${key}`;

  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return ((h >>> 0) % 1000) / 1000;
}

function getResponsiveScale(stageW: number, stageH: number) {
  if (!stageW || !stageH) return 1;

  const scaleX = stageW / 1100;
  const scaleY = stageH / 760;

  return clamp(Math.min(scaleX, scaleY), 0.58, 1.42);
}

function scaleSpec(spec: CharacterSpec, scale: number): CharacterSpec {
  const px = (n: number) => Math.max(1, Math.round(n * scale));

  return {
    ...spec,
    w: px(spec.w),
    h: px(spec.h),
    radius: spec.radius >= 999 ? 999 : px(spec.radius),
    faceTop: px(spec.faceTop),
    eyeGap: px(spec.eyeGap),
    eyeSize: px(spec.eyeSize),
    pupilSize: px(spec.pupilSize),
    pupilMaxR: px(spec.pupilMaxR),
    mouthTop: px(spec.mouthTop),
  };
}

function getScaledSpecs(scale: number): Record<Variant, CharacterSpec> {
  return {
    orange: scaleSpec(BASE_SPECS.orange, scale),
    blue: scaleSpec(BASE_SPECS.blue, scale),
    black: scaleSpec(BASE_SPECS.black, scale),
    yellow: scaleSpec(BASE_SPECS.yellow, scale),
  };
}

function getScaledLayout(scale: number) {
  const px = (n: number) => Math.round(n * scale);

  return {
    absLeft: {
      orange: px(BASE_LAYOUT.absLeft.orange),
      blue: px(BASE_LAYOUT.absLeft.blue),
      black: px(BASE_LAYOUT.absLeft.black),
      yellow: px(BASE_LAYOUT.absLeft.yellow),
    },
    absBottom: {
      orange: px(BASE_LAYOUT.absBottom.orange),
      blue: px(BASE_LAYOUT.absBottom.blue),
      black: px(BASE_LAYOUT.absBottom.black),
      yellow: px(BASE_LAYOUT.absBottom.yellow),
    },
  };
}

function computeLayout(
  layout: ReturnType<typeof getScaledLayout>,
  specs: Record<Variant, CharacterSpec>
) {
  const absL = layout.absLeft;
  const absB = layout.absBottom;

  const minLeft = Math.min(...(Object.values(absL) as number[]));

  const relLeft: Record<Variant, number> = {
    orange: absL.orange - minLeft,
    blue: absL.blue - minLeft,
    black: absL.black - minLeft,
    yellow: absL.yellow - minLeft,
  };

  const groupW =
    Math.max(
      absL.orange + specs.orange.w,
      absL.blue + specs.blue.w,
      absL.black + specs.black.w,
      absL.yellow + specs.yellow.w
    ) - minLeft;

  const minBottom = Math.min(...(Object.values(absB) as number[]));

  const relBottom: Record<Variant, number> = {
    orange: absB.orange - minBottom,
    blue: absB.blue - minBottom,
    black: absB.black - minBottom,
    yellow: absB.yellow - minBottom,
  };

  const groupH = Math.max(
    relBottom.orange + specs.orange.h,
    relBottom.blue + specs.blue.h,
    relBottom.black + specs.black.h,
    relBottom.yellow + specs.yellow.h
  );

  return {relLeft, groupW, relBottom, groupH};
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** ===================== Character ===================== */
function Character(props: {
  variant: Variant;
  spec: CharacterSpec;
  scale: number;
  mouse: Pt;
  action: GlobalAction;
  globalTilt: number;
  bootT: number;
  stageRect: { left: number; top: number; width: number; height: number };
  sceneLookMode: "track" | "peekRight";
  focusedField?: FocusedField;
  focusPeek?: boolean;
  style?: CSSProperties;
}) {
  const {
    variant,
    spec,
    scale,
    mouse,
    action,
    globalTilt,
    bootT,
    stageRect,
    sceneLookMode,
    focusedField,
    focusPeek = false,
    style,
  } = props;

  const entry = BASE_ENTRY[variant];

  const eyeLeftRef = useRef<HTMLDivElement | null>(null);
  const eyeRightRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const [expression, setExpression] = useState<Expression>("idle");
  const [blink, setBlink] = useState(false);
  const [tilt, setTilt] = useState(0);
  const [bow, setBow] = useState(0);

  const [pupilLeft, setPupilLeft] = useState<Pt>({x: 0, y: 0});
  const [pupilRight, setPupilRight] = useState<Pt>({x: 0, y: 0});

  const timersRef = useRef<number[]>([]);
  const targetLeftRef = useRef<Pt>({x: 0, y: 0});
  const targetRightRef = useRef<Pt>({x: 0, y: 0});
  const bodyCenterRef = useRef<Pt | null>(null);

  const clearTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  };

  const runAction = (fn: () => void) => {
    clearTimers();
    fn();
  };

  /** ===== Measure body center only when needed ===== */
  useEffect(() => {
    const update = () => {
      bodyCenterRef.current = getCenter(bodyRef.current);
    };

    update();

    const ro = new ResizeObserver(update);
    if (bodyRef.current) ro.observe(bodyRef.current);

    window.addEventListener("resize", update);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  /** ===== Decide target look point ===== */
  const lookTarget = useMemo(() => {
    if (focusPeek && variant === "blue") {
      return {
        x: stageRect.left + stageRect.width + 320,
        y: stageRect.top + stageRect.height * 0.26,
      };
    }

    if (sceneLookMode === "peekRight") {
      return {
        x: stageRect.left + stageRect.width + 180,
        y: stageRect.top + stageRect.height * 0.42,
      };
    }

    return mouse;
  }, [focusPeek, mouse, sceneLookMode, stageRect, variant]);

  /** ===== Update pupil target ===== */
  useEffect(() => {
    const cL = getCenter(eyeLeftRef.current);
    const cR = getCenter(eyeRightRef.current);

    const left = cL
      ? vecToPupilOffset(cL, lookTarget, spec.pupilMaxR)
      : {x: 0, y: 0};

    const right = cR
      ? vecToPupilOffset(cR, lookTarget, spec.pupilMaxR)
      : {x: 0, y: 0};

    targetLeftRef.current = {
      x: clamp(left.x, -spec.pupilMaxR, spec.pupilMaxR),
      y: clamp(left.y, -spec.pupilMaxR, spec.pupilMaxR),
    };

    targetRightRef.current = {
      x: clamp(right.x, -spec.pupilMaxR, spec.pupilMaxR),
      y: clamp(right.y, -spec.pupilMaxR, spec.pupilMaxR),
    };
  }, [lookTarget, spec.pupilMaxR]);

  /** ===== Smooth pupil motion via rAF ===== */
  useEffect(() => {
    let raf = 0;

    const tick = () => {
      setPupilLeft((prev) => ({
        x: lerp(prev.x, targetLeftRef.current.x, 0.25),
        y: lerp(prev.y, targetLeftRef.current.y, 0.25),
      }));

      setPupilRight((prev) => ({
        x: lerp(prev.x, targetRightRef.current.x, 0.25),
        y: lerp(prev.y, targetRightRef.current.y, 0.25),
      }));

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, []);

  /** ===== Random idle blink ===== */
  useEffect(() => {
    let blinkTimer = 0;
    let reopenTimer = 0;
    let disposed = false;

    const loop = () => {
      const wait = 2400 + Math.random() * 2800;

      blinkTimer = window.setTimeout(() => {
        if (disposed) return;

        setBlink(true);

        reopenTimer = window.setTimeout(() => {
          if (disposed) return;

          setBlink(false);
          loop();
        }, 120 + Math.random() * 50);
      }, wait);
    };

    loop();

    return () => {
      disposed = true;
      window.clearTimeout(blinkTimer);
      window.clearTimeout(reopenTimer);
    };
  }, []);

  /** ===== Entry animation ===== */
  const dist = Math.round((entry.dist ?? 220) * scale);
  const enterDur = 650;
  const t01 = (bootT - entry.delayMs) / enterDur;
  const p = clamp(t01, 0, 1);
  const b = bounceOut(p);

  let enterX = 0;
  let enterY = 0;

  if (entry.mode === "bottomBounce") {
    enterY = (1 - b) * dist;
  } else if (entry.mode === "topDrop") {
    enterY = -(1 - b) * dist;
  } else if (entry.mode === "sideSlide") {
    enterX = -(1 - b) * dist;
  }

  const pop = smooth01((p - 0.72) / 0.28);
  const enterScale = 1 + 0.05 * pop * (1 - (p > 0.95 ? (p - 0.95) / 0.05 : 0));

  /** ===== Mouse-based face parallax / body lean ===== */
  const bodyCenter = bodyCenterRef.current;

  let faceShiftX = 0;
  let faceShiftY = 0;
  let mouseLean = 0;

  if (bodyCenter) {
    const dx = lookTarget.x - bodyCenter.x;
    const dy = lookTarget.y - bodyCenter.y;

    faceShiftX = clamp(dx / 26, -12 * scale, 12 * scale);
    faceShiftY = clamp(dy / 42, -8 * scale, 8 * scale);
    mouseLean = clamp(dx / 90, -5.5, 5.5);
  }

  /** ===== Idle breathing ===== */
  const idlePhase =
    ((bootT +
      (variant === "orange"
        ? 0
        : variant === "blue"
          ? 280
          : variant === "black"
            ? 540
            : 820)) %
      2200) /
    2200;

  const breathe = Math.sin(idlePhase * Math.PI * 2);
  const breatheY = breathe * 2.8 * scale;
  const breatheScaleY = 1 + breathe * 0.01;

  /** ===== Focus peek animation for blue character ===== */
  const shouldFocusPeek = focusPeek && variant === "blue";

  const peekLift = 0;

  // 身体往右“撑开/探头”，不要整体抬起来
  const peekSkew = shouldFocusPeek ? -7 : 0;

  // rotate 会让底部一边翘起来，所以这里一定要小
  const peekRotate = shouldFocusPeek ? 1.2 : 0;

  // 高度变高，但脚底不动，因为 transformOrigin 是 50% 100%
  const peekScaleY = shouldFocusPeek ? 1.12 : 1;
  const peekScaleX = shouldFocusPeek ? 1.08 : 1;

  // 只让脸稍微往上走，不要让身体离地
  const peekFaceLift = shouldFocusPeek ? -10 * scale : 0;

  /** ===== Actions ===== */
  const doBlink = () =>
    runAction(() => {
      setBlink(true);
      timersRef.current.push(window.setTimeout(() => setBlink(false), 140));
    });

  const doSurprise = () =>
    runAction(() => {
      setExpression("surprise");
      setBlink(false);
      timersRef.current.push(
        window.setTimeout(() => setExpression("idle"), 900)
      );
    });

  const doSmile = () =>
    runAction(() => {
      setExpression("smile");
      timersRef.current.push(
        window.setTimeout(() => setExpression("idle"), 1200)
      );
    });

  useEffect(() => {
    if (variant !== "blue") return;

    clearTimers();

    if (focusedField === "userName") {
      setExpression("surprise");
      setBlink(false);
      return;
    }

    if (focusedField === "userPassword") {
      setExpression("smile");
      setBlink(false);
      return;
    }

    setExpression("idle");
  }, [focusedField, variant]);

  const doTilt = (amp: number) =>
    runAction(() => {
      setTilt(-10 * spec.tiltMul * amp);
      timersRef.current.push(
        window.setTimeout(() => setTilt(10 * spec.tiltMul * amp), 160)
      );
      timersRef.current.push(
        window.setTimeout(() => setTilt(-6 * spec.tiltMul * amp), 320)
      );
      timersRef.current.push(window.setTimeout(() => setTilt(0), 520));
    });

  const doShakeHead = (amp: number) =>
    runAction(() => {
      const A = 12 * spec.shakeMul * amp;

      setTilt(-A);
      timersRef.current.push(window.setTimeout(() => setTilt(A), 120));
      timersRef.current.push(window.setTimeout(() => setTilt(-A * 0.85), 240));
      timersRef.current.push(window.setTimeout(() => setTilt(A * 0.85), 360));
      timersRef.current.push(window.setTimeout(() => setTilt(0), 520));
    });

  const doBow = (amp: number) =>
    runAction(() => {
      const B = 1 * spec.bowMul * amp;

      setBow(B);
      timersRef.current.push(window.setTimeout(() => setBow(B * 0.6), 120));
      timersRef.current.push(window.setTimeout(() => setBow(B * 0.9), 240));
      timersRef.current.push(window.setTimeout(() => setBow(0), 520));
    });

  const doThanks = (amp: number) =>
    runAction(() => {
      setExpression("smile");
      setBlink(true);
      setBow(1 * spec.bowMul * amp);

      timersRef.current.push(window.setTimeout(() => setBlink(false), 140));
      timersRef.current.push(window.setTimeout(() => setBow(0), 520));
      timersRef.current.push(
        window.setTimeout(() => setExpression("idle"), 900)
      );
    });

  useEffect(() => {
    const j = hash01(action.nonce, variant);
    const amp = spec.actionAmp * (0.92 + j * 0.16);
    const delay = Math.round(spec.actionDelayBaseMs + j * 24);

    const t = window.setTimeout(() => {
      switch (action.type) {
        case "BLINK":
          doBlink();
          break;
        case "SMILE":
          doSmile();
          break;
        case "SURPRISE":
          doSurprise();
          break;
        case "TILT":
          doTilt(amp);
          break;
        case "SHAKE":
          doShakeHead(amp);
          break;
        case "BOW":
          doBow(amp);
          break;
        case "THANKS":
          doThanks(amp);
          break;
        default:
          break;
      }
    }, delay);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action.nonce]);

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const global = globalTilt * 0.65;

  const bodyTransform = `
    translateX(${enterX}px)
    translateY(${enterY + breatheY + peekLift}px)
    scale(${enterScale})
    rotate(${global + mouseLean * 0.25 + tilt + peekRotate}deg)
    skewX(${peekSkew}deg)
    translateY(${bow * 10 * scale}px)
    scaleX(${peekScaleX})
    scaleY(${(1 - bow * 0.06) * breatheScaleY * peekScaleY})
  `;

  const eyeStyle: React.CSSProperties = {
    width: spec.eyeSize,
    height: blink ? Math.max(4, Math.round(spec.eyeSize * 0.25)) : spec.eyeSize,
    borderRadius: 999,
    background: "#fff",
    position: "relative",
    overflow: "hidden",
    transition: "height 120ms ease",
    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.08)",
  };

  const pupilStyleBase: React.CSSProperties = {
    width: spec.pupilSize,
    height: spec.pupilSize,
    borderRadius: 999,
    background: "#111",
    position: "absolute",
    left: "50%",
    top: "50%",
    opacity: blink ? 0 : 1,
    transition: "opacity 80ms ease",
    willChange: "transform",
  };

  const mouthColor =
    variant === "black" ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.35)";

  const mouthNode = (() => {
    if (expression === "surprise") {
      return (
        <div
          style={{
            position: "absolute",
            top: spec.mouthTop + faceShiftY * 0.25 + peekFaceLift,
            left: "50%",
            transform: `translateX(calc(-50% + ${faceShiftX * 0.2}px))`,
            width: Math.max(8, Math.round(10 * scale)),
            height: Math.max(10, Math.round(14 * scale)),
            borderRadius: 999,
            background: mouthColor,
            transition: "all 180ms ease",
          }}
        />
      );
    }

    if (expression === "smile") {
      return (
        <div
          style={{
            position: "absolute",
            top: spec.mouthTop + faceShiftY * 0.2 + peekFaceLift,
            left: "50%",
            transform: `translateX(calc(-50% + ${faceShiftX * 0.18}px))`,
            width: Math.max(16, Math.round(22 * scale)),
            height: Math.max(8, Math.round(12 * scale)),
            borderBottomLeftRadius: 999,
            borderBottomRightRadius: 999,
            borderTopLeftRadius: Math.max(8, Math.round(10 * scale)),
            borderTopRightRadius: Math.max(8, Math.round(10 * scale)),
            border: `${Math.max(
              2,
              Math.round(3 * scale)
            )}px solid ${mouthColor}`,
            borderTop: "0px solid transparent",
            background: "transparent",
            transition: "all 180ms ease",
          }}
        />
      );
    }

    return (
      <div
        style={{
          position: "absolute",
          top: spec.mouthTop + faceShiftY * 0.18 + peekFaceLift,
          left: "50%",
          transform: `translateX(calc(-50% + ${faceShiftX * 0.15}px))`,
          width: Math.max(14, Math.round(18 * scale)),
          height: Math.max(4, Math.round(6 * scale)),
          borderRadius: 999,
          background: mouthColor,
          transition: "all 180ms ease",
        }}
      />
    );
  })();

  const faceLayer: CSSProperties = {
    position: "absolute",
    top: spec.faceTop + faceShiftY + peekFaceLift,
    left: 0,
    right: 0,
    display: "flex",
    justifyContent: "center",
    gap: spec.eyeGap,
    pointerEvents: "none",
    transform: `translateX(${faceShiftX}px)`,
    transition:
      "transform 160ms linear, top 220ms cubic-bezier(0.16, 1, 0.3, 1)",
  };

  const transition =
    "transform 620ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 420ms ease";

  const shadowBlur = Math.max(10, Math.round(18 * scale));
  const transformOrigin = shouldFocusPeek ? "50% 100%" : "50% 85%";

  if (spec.shape === "semiTop") {
    const wrap: CSSProperties = {
      width: spec.w,
      height: spec.h,
      position: "relative",
      overflow: "hidden",
      borderRadius: Math.max(10, Math.round(12 * scale)),
      transform: bodyTransform,
      transformOrigin,
      transition,
      ...(style || {}),
    };

    const circle: CSSProperties = {
      position: "absolute",
      left: 0,
      top: 0,
      width: spec.w,
      height: spec.h * 2,
      borderRadius: 999,
      background: spec.bg,
      boxShadow: `0 ${Math.round(
        10 * scale
      )}px ${shadowBlur}px rgba(0,0,0,0.10)`,
    };

    return (
      <div ref={bodyRef} style={wrap}>
        <div style={circle}/>

        <div style={faceLayer}>
          <div ref={eyeLeftRef} style={eyeStyle}>
            <div
              style={{
                ...pupilStyleBase,
                transform: `translate(-50%, -50%) translate(${pupilLeft.x}px, ${pupilLeft.y}px)`,
              }}
            />
          </div>

          <div ref={eyeRightRef} style={eyeStyle}>
            <div
              style={{
                ...pupilStyleBase,
                transform: `translate(-50%, -50%) translate(${pupilRight.x}px, ${pupilRight.y}px)`,
              }}
            />
          </div>
        </div>

        {mouthNode}
      </div>
    );
  }

  const body: CSSProperties = {
    width: spec.w,
    height: spec.h,
    background: spec.bg,
    borderRadius: spec.radius,
    position: "relative",
    boxShadow: `0 ${Math.round(10 * scale)}px ${shadowBlur}px rgba(0,0,0,0.10)`,
    transform: bodyTransform,
    transformOrigin,
    transition,
    willChange: "transform",
    ...(style || {}),
  };

  return (
    <div ref={bodyRef} style={body}>
      <div style={faceLayer}>
        <div ref={eyeLeftRef} style={eyeStyle}>
          <div
            style={{
              ...pupilStyleBase,
              transform: `translate(-50%, -50%) translate(${pupilLeft.x}px, ${pupilLeft.y}px)`,
            }}
          />
        </div>

        <div ref={eyeRightRef} style={eyeStyle}>
          <div
            style={{
              ...pupilStyleBase,
              transform: `translate(-50%, -50%) translate(${pupilRight.x}px, ${pupilRight.y}px)`,
            }}
          />
        </div>
      </div>

      {mouthNode}
    </div>
  );
}

/** ===================== Scene ===================== */
const CharactersScene = forwardRef<HTMLDivElement,
  {
    mouse: Pt;
    action: GlobalAction;
    globalTilt: number;
    bootT: number;
    stageW: number;
    stageH: number;
    stageRect: { left: number; top: number; width: number; height: number };
    focusedField: FocusedField;
  }>(
  (
    {
      mouse,
      action,
      globalTilt,
      bootT,
      stageW,
      stageH,
      stageRect,
      focusedField,
    },
    ref
  ) => {
    const responsiveScale = useMemo(
      () => getResponsiveScale(stageW, stageH),
      [stageW, stageH]
    );

    const specs = useMemo(
      () => getScaledSpecs(responsiveScale),
      [responsiveScale]
    );

    const layout = useMemo(
      () => getScaledLayout(responsiveScale),
      [responsiveScale]
    );

    const {relLeft, groupW, relBottom, groupH} = useMemo(
      () => computeLayout(layout, specs),
      [layout, specs]
    );

    const baseLeft = Math.max(0, (stageW - groupW) / 2);
    const baseBottom = Math.max(0, (stageH - groupH) / 2 - stageH * 0.1);

    const sceneLookMode: "track" | "peekRight" = useMemo(() => {
      if (focusedField) return "peekRight";

      const stageRight = stageRect.left + stageRect.width;
      const nearFormArea = mouse.x > stageRight - 30;

      return nearFormArea ? "peekRight" : "track";
    }, [focusedField, mouse.x, stageRect]);

    const blueFocusPeek = !!focusedField;

    return (
      <div
        ref={ref}
        style={{
          width: "100%",
          height: "100vh",
          background: `
            radial-gradient(circle at 18% 16%, rgba(90, 151, 200, 0.10) 0%, rgba(90, 151, 200, 0.05) 20%, rgba(90, 151, 200, 0) 42%),
            radial-gradient(circle at 78% 12%, rgba(87, 169, 200, 0.08) 0%, rgba(87, 169, 200, 0.03) 18%, rgba(87, 169, 200, 0) 36%),
            linear-gradient(180deg, #F8FAFC 0%, #F2F6FA 100%)
          `,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.58)",
          boxShadow: `
            0 18px 50px rgba(15, 23, 42, 0.08),
            inset 0 1px 0 rgba(255,255,255,0.6)
          `,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        />

        <div className="scene-overlay scene-overlay-top"/>
        <div className="scene-overlay scene-overlay-floor"/>

        <div className="scene-glow scene-glow-left"/>
        <div className="scene-glow scene-glow-right"/>

        <div className="scene-bubbles">
          <span className="bubble bubble-1"/>
          <span className="bubble bubble-2"/>
          <span className="bubble bubble-3"/>
          <span className="bubble bubble-4"/>
          <span className="bubble bubble-5"/>
          <span className="bubble bubble-6"/>
          <span className="bubble bubble-7"/>
        </div>

        <div className="scene-sparkles">
          <span className="spark spark-1"/>
          <span className="spark spark-2"/>
          <span className="spark spark-3"/>
          <span className="spark spark-4"/>
        </div>

        <SceneCopy/>

        <Character
          variant="orange"
          spec={specs.orange}
          scale={responsiveScale}
          mouse={mouse}
          action={action}
          globalTilt={globalTilt}
          bootT={bootT}
          stageRect={stageRect}
          sceneLookMode={sceneLookMode}
          style={{
            position: "absolute",
            left: baseLeft + relLeft.orange,
            bottom: baseBottom + relBottom.orange,
            zIndex: 30,
          }}
        />

        <Character
          variant="blue"
          spec={specs.blue}
          scale={responsiveScale}
          mouse={mouse}
          action={action}
          globalTilt={globalTilt}
          bootT={bootT}
          stageRect={stageRect}
          sceneLookMode={sceneLookMode}
          focusedField={focusedField}
          focusPeek={blueFocusPeek}
          style={{
            position: "absolute",
            left: baseLeft + relLeft.blue,
            bottom: baseBottom + relBottom.blue,
            zIndex: 10,
          }}
        />

        <Character
          variant="black"
          spec={specs.black}
          scale={responsiveScale}
          mouse={mouse}
          action={action}
          globalTilt={globalTilt}
          bootT={bootT}
          stageRect={stageRect}
          sceneLookMode={sceneLookMode}
          style={{
            position: "absolute",
            left: baseLeft + relLeft.black,
            bottom: baseBottom + relBottom.black,
            zIndex: 12,
          }}
        />

        <Character
          variant="yellow"
          spec={specs.yellow}
          scale={responsiveScale}
          mouse={mouse}
          action={action}
          globalTilt={globalTilt}
          bootT={bootT}
          stageRect={stageRect}
          sceneLookMode={sceneLookMode}
          style={{
            position: "absolute",
            left: baseLeft + relLeft.yellow,
            bottom: baseBottom + relBottom.yellow,
            zIndex: 11,
          }}
        />
      </div>
    );
  }
);

CharactersScene.displayName = "CharactersScene";

/** ===================== Page ===================== */
export default function BlueCrewDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [mouse, setMouse] = useState<Pt>({x: 0, y: 0});
  const [action, setAction] = useState<GlobalAction>({
    type: "BLINK",
    nonce: 0,
  });

  const [globalTilt, setGlobalTilt] = useState(0);
  const [bootT, setBootT] = useState(0);
  const [stageRect, setStageRect] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  const [focusedField, setFocusedField] = useState<FocusedField>(null);

  const bootStartRef = useRef<number>(0);
  const mouseTargetRef = useRef<Pt>({x: 0, y: 0});
  const tiltTargetRef = useRef(0);

  /** ===== Boot timeline ===== */
  useEffect(() => {
    bootStartRef.current = performance.now();
    let raf = 0;

    const tick = () => {
      const now = performance.now();
      setBootT(now - bootStartRef.current);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, []);

  /** ===== Smooth mouse + tilt ===== */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseTargetRef.current = {x: e.clientX, y: e.clientY};

      const r = stageRef.current?.getBoundingClientRect();
      if (!r) return;

      const cx = r.left + r.width / 2;
      const dx = (e.clientX - cx) / (r.width / 2);

      tiltTargetRef.current = clamp(dx, -1, 1) * 6;
    };

    window.addEventListener("mousemove", onMove, {passive: true});

    let raf = 0;

    const animate = () => {
      setMouse((prev) => ({
        x: lerp(prev.x, mouseTargetRef.current.x, 0.22),
        y: lerp(prev.y, mouseTargetRef.current.y, 0.22),
      }));

      setGlobalTilt((prev) => lerp(prev, tiltTargetRef.current, 0.14));

      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  /** ===== Stage measurement ===== */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const update = () => {
      const r = el.getBoundingClientRect();

      setStageRect({
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
      });
    };

    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();

    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);

    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, []);

  const fire = (type: ActionType) => {
    setAction({type, nonce: Date.now()});
  };

  return (
    <div style={{position: "relative", height: "100vh"}}>
      <div style={{zIndex: 600}}>
        <Row gutter={24} style={{margin: 0, padding: 0, zIndex: 600}}>
          <Col
            xs={24}
            sm={24}
            md={14}
            lg={14}
            xl={14}
            style={{margin: 0, padding: 0}}
          >
            <CharactersScene
              ref={stageRef}
              mouse={mouse}
              action={action}
              globalTilt={globalTilt}
              bootT={bootT}
              stageW={stageRect.width}
              stageH={stageRect.height}
              stageRect={stageRect}
              focusedField={focusedField}
            />
          </Col>

          <Col
            xs={24}
            sm={24}
            md={10}
            lg={10}
            xl={10}
            style={{
              display: "flex",
              flexDirection: "column",
              margin: 0,
              padding: 0,
            }}
          >
            <LoginPanel onFire={fire} onFieldFocusChange={setFocusedField}/>
          </Col>
        </Row>
      </div>
    </div>
  );
}
