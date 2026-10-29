"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BASE_CURVE,
  ROUTE_ONE_EXTENSION,
  ROUTE_THREE_BRANCHES,
  ROUTE_THREE_CONTACT_POINTS,
  ROUTE_THREE_CURVE,
  ROUTE_THREE_ENVELOPE_FRAGMENTS,
  ROUTE_TWO_CURVE,
  clamp,
} from "./curve-math";
import type { Point } from "./curve-math";

import { getCopy, localize, projectPath } from "./i18n.mjs";
import type { Locale } from "./i18n.mjs";
import { selectStoryChapter } from "./story-chapters.mjs";

import registry from "../config/projects.json";
import projectCategories from "../config/categories.json";

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
const projectCards = registry.map(project => ({
  ...project,
  route: project.route as "02" | "03",
  logo: `${base}/${project.logo}`,
}));
const routeClasses = {
  "02": "route-two",
  "03": "route-three",
} as const;
const projectsByRoute = [...projectCards].sort((a, b) => a.route.localeCompare(b.route));

// Screen-space trails keep motion legible at every viewport size.
const TRAVELER_SPEED = 340;
const TRAVELER_MIN_WINDOW = 2.15;
const TRAVELER_STAGGER = 0.6;
const TRAVELER_SETTLE_TIME = 1.15;
const travelerLegs = [
  { points: ROUTE_ONE_EXTENSION, color: "#7b3a8a" },
  { points: ROUTE_TWO_CURVE, color: "#5f9f47" },
  { points: ROUTE_THREE_CURVE, color: "#155bae" },
] as const;

type RouteThreeHover = {
  branch: Point[];
  branchIndex: number;
};

type OverviewRouteId = "route-one" | "route-two" | "route-three";

function easeInOutCubic(progress: number) {
  const t = clamp(progress);
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothStep(progress: number) {
  const t = clamp(progress);
  return t * t * (3 - 2 * t);
}

// Asymmetric cubic-bezier(.42, 0, .12, 1): a short acceleration,
// a pronounced sweep, and a longer, weightless deceleration. Solve time (x)
// before evaluating distance (y), rather than treating the parameter as time.
function travelerMotion(progress: number) {
  const time = clamp(progress);
  if (time === 0 || time === 1) return { position: time, velocity: 0 };
  let low = 0;
  let high = 1;
  let t = time;
  for (let i = 0; i < 18; i += 1) {
    const x = 3 * (1 - t) ** 2 * t * 0.42 + 3 * (1 - t) * t * t * 0.12 + t ** 3;
    if (x < time) low = t;
    else high = t;
    t = (low + high) / 2;
  }
  const dx = 3 * (1 - t) ** 2 * 0.42 + 6 * (1 - t) * t * (0.12 - 0.42) + 3 * t * t * (1 - 0.12);
  return {
    position: t * t * (3 - 2 * t),
    velocity: 6 * t * (1 - t) / dx,
  };
}

function getPlot(width: number, height: number) {
  return window.innerWidth < 980
    ? { left: 34, right: width - 24, top: 48, bottom: height - 30 }
    : {
        left: Math.max(60, width * 0.085),
        right: width - 60,
        top: 102,
        bottom: height - 72,
      };
}

function distanceToCurve(
  points: Point[],
  pointer: { x: number; y: number },
  plot: ReturnType<typeof getPlot>,
) {
  const plotWidth = plot.right - plot.left;
  const plotHeight = plot.bottom - plot.top;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    const fromX = plot.left + from.x * plotWidth;
    const fromY = plot.top + from.y * plotHeight;
    const toX = plot.left + to.x * plotWidth;
    const toY = plot.top + to.y * plotHeight;
    const deltaX = toX - fromX;
    const deltaY = toY - fromY;
    const squaredLength = deltaX * deltaX + deltaY * deltaY;
    const segmentProgress = squaredLength
      ? clamp(((pointer.x - fromX) * deltaX + (pointer.y - fromY) * deltaY) / squaredLength)
      : 0;
    const nearestX = fromX + deltaX * segmentProgress;
    const nearestY = fromY + deltaY * segmentProgress;
    nearestDistance = Math.min(
      nearestDistance,
      Math.hypot(pointer.x - nearestX, pointer.y - nearestY),
    );
  }

  return nearestDistance;
}

function getOverviewRouteAtPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  pointerType = "mouse",
): OverviewRouteId | null {
  const rect = canvas.getBoundingClientRect();
  const plot = getPlot(rect.width, rect.height);
  const pointer = {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
  const routes: Array<{ id: OverviewRouteId; curves: Point[][] }> = [
    { id: "route-one", curves: [BASE_CURVE, ROUTE_ONE_EXTENSION] },
    { id: "route-two", curves: [ROUTE_TWO_CURVE] },
    { id: "route-three", curves: [ROUTE_THREE_CURVE] },
  ];
  let nearestRoute: OverviewRouteId | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  routes.forEach(({ id, curves }) => {
    const distance = Math.min(...curves.map((curve) => distanceToCurve(curve, pointer, plot)));
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestRoute = id;
    }
  });

  const hitRadius = pointerType === "touch" ? 32 : window.innerWidth < 980 ? 26 : 20;
  return nearestDistance <= hitRadius ? nearestRoute : null;
}

function scrollToStoryStage(id: OverviewRouteId) {
  const stage = document.getElementById(id);
  if (!stage) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  stage.scrollIntoView({
    behavior: reducedMotion ? "auto" : "smooth",
    block: "start",
  });
  if (window.location.hash !== `#${id}`) {
    window.history.pushState(null, "", `#${id}`);
  }
}

function ProjectLink({ name, url }: { name: string; url: string }) {
  return (
    <a href={url} className="project-pill">
      <strong>{name}</strong>
      <span aria-hidden="true">↗</span>
    </a>
  );
}

// Keep short Chinese clauses together; long clauses can still wrap on narrow screens.
function StoryBody({ text, locale }: { text: string; locale: Locale }) {
  if (locale !== "zh") return <>{text}</>;
  return <>{text.match(/[^，。；！？：]+[，。；！？：]?/gu)?.map((phrase, index) => (
    <span className="story-phrase" key={index}>{phrase}</span>
  ))}</>;
}

export default function Home({ locale = "en" }: { locale?: Locale }) {
  const copy = getCopy(locale);
  const { stages, chartDescriptions } = copy;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stepRefs = useRef<Array<HTMLElement | null>>([]);
  const frameRef = useRef(0);
  const lineAnimationRef = useRef(0);
  const stageRef = useRef(-1);
  const revealRef = useRef(stages.map(() => 1));
  const routeThreeHoverRef = useRef<RouteThreeHover | null>(null);
  const ambientTimeRef = useRef<number | null>(null);
  const ambientFrameRef = useRef(0);
  const ambientVisibleSinceRef = useRef(0);
  const [activeStage, setActiveStage] = useState(0);

  const drawChart = useCallback((focus: number[], reveal: number[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(rect.width * ratio) || canvas.height !== Math.round(rect.height * ratio)) {
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const compact = window.innerWidth < 980;
    const plot = getPlot(rect.width, rect.height);
    const width = plot.right - plot.left;
    const height = plot.bottom - plot.top;
    const map = (point: Point) => ({
      x: plot.left + point.x * width,
      y: plot.top + point.y * height,
    });

    const axisColor = "rgba(29, 29, 31, .5)";
    ctx.strokeStyle = axisColor;
    ctx.fillStyle = axisColor;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(plot.left, plot.bottom);
    ctx.lineTo(plot.right + 10, plot.bottom);
    ctx.moveTo(plot.left, plot.bottom);
    ctx.lineTo(plot.left, plot.top - 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(plot.right + 10, plot.bottom);
    ctx.lineTo(plot.right + 1, plot.bottom - 4);
    ctx.lineTo(plot.right + 1, plot.bottom + 4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(plot.left, plot.top - 10);
    ctx.lineTo(plot.left - 4, plot.top - 1);
    ctx.lineTo(plot.left + 4, plot.top - 1);
    ctx.closePath();
    ctx.fill();

    const path = (points: Point[], color: string, lineWidth: number, alpha = 1, progress = 1) => {
      if (points.length < 2) return;
      const visibleProgress = clamp(progress);
      const mappedPoints = points.map(map);
      const segmentLengths = mappedPoints.slice(1).map((point, index) => (
        Math.hypot(point.x - mappedPoints[index].x, point.y - mappedPoints[index].y)
      ));
      const totalLength = segmentLengths.reduce((total, length) => total + length, 0);
      const visibleLength = totalLength * visibleProgress;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash([]);
      ctx.beginPath();
      const first = mappedPoints[0];
      ctx.moveTo(first.x, first.y);
      let traversedLength = 0;
      for (let index = 1; index < mappedPoints.length; index += 1) {
        const segmentLength = segmentLengths[index - 1];
        const point = mappedPoints[index];
        if (traversedLength + segmentLength <= visibleLength) {
          ctx.lineTo(point.x, point.y);
          traversedLength += segmentLength;
          continue;
        }

        const previous = mappedPoints[index - 1];
        const remainingLength = Math.max(0, visibleLength - traversedLength);
        const segmentProgress = segmentLength ? remainingLength / segmentLength : 0;
        ctx.lineTo(
          previous.x + (point.x - previous.x) * segmentProgress,
          previous.y + (point.y - previous.y) * segmentProgress,
        );
        break;
      }
      ctx.stroke();
      ctx.restore();
    };

    const overview = focus[0] ?? 0;
    const routeOneFocus = focus[1] ?? 0;
    const routeTwoFocus = focus[2] ?? 0;
    const routeThreeFocus = focus[3] ?? 0;
    const curveAlpha = (weight: number) => clamp(0.12 + 0.88 * Math.max(overview, weight));
    const routeOneAlpha = curveAlpha(routeOneFocus);
    const routeTwoAlpha = curveAlpha(routeTwoFocus);
    const routeThreeAlpha = curveAlpha(routeThreeFocus);
    const overviewProgress = reveal[0] ?? 1;
    const routeOneProgress = overview > 0.5 ? overviewProgress : routeOneFocus > 0.5 ? reveal[1] ?? 1 : 1;
    const routeTwoProgress = overview > 0.5 ? overviewProgress : routeTwoFocus > 0.5 ? reveal[2] ?? 1 : 1;
    const routeThreeProgress = overview > 0.5 ? overviewProgress : routeThreeFocus > 0.5 ? reveal[3] ?? 1 : 1;
    const baselineIsDrawing = overview > 0.5;
    const routeOneIsDrawing = overview > 0.5 || routeOneFocus > 0.5;
    const routeTwoIsDrawing = overview > 0.5 || routeTwoFocus > 0.5;
    const routeThreeIsDrawing = overview > 0.5 || routeThreeFocus > 0.5;
    const currentFrontierProgress = baselineIsDrawing ? clamp(routeOneProgress / 0.62) : 1;
    const routeOneExtensionProgress = overview > 0.5
      ? clamp((routeOneProgress - 0.62) / 0.38)
      : routeOneFocus > 0.5 ? routeOneProgress : 1;
    const routeThreeEnvelopePhase = routeThreeFocus > 0.5
      ? clamp((routeThreeProgress - 0.68) / 0.32)
      : routeThreeProgress;
    const routeThreeEnvelopeProgress = routeThreeFocus > 0.5
      ? clamp((routeThreeEnvelopePhase - 0.68) / 0.32)
      : routeThreeProgress;
    const selectedBranch = routeThreeFocus > 0.5 && routeThreeProgress > 0.12
      ? routeThreeHoverRef.current
      : null;
    const inspectionFade = selectedBranch ? 0.14 : 1;
    const baselineAlpha = 1;
    const baseWidth = compact ? 2.5 : 3.2;
    const focusedWidth = (weight: number) => baseWidth + 0.85 * Math.max(overview * 0.2, weight);
    const routeThreeWidth = (compact ? 2.05 : 2.55) + 0.25 * Math.max(overview, routeThreeFocus);
    const terminalReveal = (progress: number) => clamp((progress - 0.78) / 0.22);
    const labelReveal = (progress: number, start = 0.52) => clamp((progress - start) / (1 - start));
    const animatedAlpha = (alpha: number, progress: number, isDrawing: boolean, start?: number) => (
      isDrawing ? alpha * labelReveal(progress, start) : alpha
    );
    const animatedPath = (
      points: Point[],
      color: string,
      lineWidth: number,
      alpha: number,
      progress: number,
      isDrawing: boolean,
    ) => {
      if (!isDrawing) {
        path(points, color, lineWidth, alpha);
        return;
      }
      path(points, color, baseWidth, 0.1);
      path(points, color, lineWidth, alpha, progress);
    };
    const interpolateCurve = (from: Point[], to: Point[], progress: number) => (
      from.map((point, index) => ({
        x: point.x + (to[index].x - point.x) * progress,
        y: point.y + (to[index].y - point.y) * progress,
      }))
    );
    const routeTwoRenderedCurve = routeTwoIsDrawing
      ? interpolateCurve(BASE_CURVE, ROUTE_TWO_CURVE, routeTwoProgress)
      : ROUTE_TWO_CURVE;

    // Every path keeps its geometry. Entering a chapter reveals its route from
    // start to finish while a faint full-path trace preserves the comparison.
    animatedPath(
      BASE_CURVE,
      "#1d1d1f",
      focusedWidth(routeOneFocus),
      baselineAlpha * inspectionFade,
      currentFrontierProgress,
      baselineIsDrawing,
    );
    animatedPath(
      ROUTE_ONE_EXTENSION,
      "#7b3a8a",
      focusedWidth(routeOneFocus),
      routeOneAlpha * inspectionFade,
      routeOneExtensionProgress,
      routeOneIsDrawing,
    );
    if (routeTwoIsDrawing) {
      // Route 2 is a deformation of the current frontier, not a new stroke
      // growing from the origin. The faint green trace marks its destination.
      path(ROUTE_TWO_CURVE, "#5f9f47", baseWidth, 0.08 * inspectionFade);
      path(
        routeTwoRenderedCurve,
        "#5f9f47",
        focusedWidth(routeTwoFocus),
        routeTwoAlpha * inspectionFade * (0.25 + 0.75 * routeTwoProgress),
      );
    } else {
      path(ROUTE_TWO_CURVE, "#5f9f47", focusedWidth(routeTwoFocus), routeTwoAlpha * inspectionFade);
    }

    if (routeThreeFocus > 0.5) {
      // Each branch is a full scaling instance: it enters with the envelope's
      // weight, then settles into a thin contextual trace after completing.
      const settledBranchWidth = compact ? 0.8 : 1.05;
      const settledBranchAlpha = 0.14 * (1 - 0.62 * routeThreeEnvelopePhase)
        * (selectedBranch ? 0.18 : 1);
      ROUTE_THREE_BRANCHES.forEach((branch, index) => {
        if (branch.length < 2) return;
        // Every instance uses Route 1's cubic ease-in-out stroke motion. A
        // gentle quadratic cadence keeps every late branch distinguishable:
        // start gaps and durations shrink continuously, never collapse at once.
        const cadenceProgress = index / (ROUTE_THREE_BRANCHES.length - 1);
        const delay = 0.62 * (
          1.75 * cadenceProgress - 0.75 * cadenceProgress * cadenceProgress
        );
        const branchDuration = 0.06 - 0.03 * Math.pow(cadenceProgress, 0.85);
        const localProgress = routeThreeProgress - delay;
        const branchProgress = easeInOutCubic(localProgress / branchDuration);
        const settleProgress = clamp((localProgress - branchDuration) / 0.012);
        const branchWidth = routeThreeWidth
          + (settledBranchWidth - routeThreeWidth) * settleProgress;
        const branchAlpha = routeThreeAlpha
          + (settledBranchAlpha - routeThreeAlpha) * settleProgress;
        path(branch, "#155bae", branchWidth, branchAlpha, branchProgress);

        const anchor = map(branch[0]);
        ctx.save();
        const settledAnchorAlpha = 0.42 * (1 - 0.62 * routeThreeEnvelopePhase)
          * (selectedBranch ? 0.18 : 1);
        ctx.globalAlpha = branchProgress
          * (0.75 + (settledAnchorAlpha - 0.75) * settleProgress);
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#155bae";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(anchor.x, anchor.y, compact ? 2.5 : 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      // After a short pause, local tangency neighborhoods appear in sequence.
      // Only after all of them are visible do they merge into one frontier.
      ROUTE_THREE_ENVELOPE_FRAGMENTS.forEach((fragment, index) => {
        const delay = index * 0.052;
        const fragmentProgress = clamp((routeThreeEnvelopePhase - delay) / 0.2);
        const fragmentAlpha = routeThreeAlpha * 0.72 * (1 - 0.7 * routeThreeEnvelopeProgress)
          * inspectionFade;
        path(
          fragment,
          "#155bae",
          routeThreeWidth,
          fragmentAlpha,
          fragmentProgress,
        );
      });

      ROUTE_THREE_CONTACT_POINTS.forEach((point, index) => {
        const delay = index * 0.052;
        const contactAlpha = clamp((routeThreeEnvelopePhase - delay) / 0.16);
        const contact = map(point);
        ctx.save();
        ctx.globalAlpha = contactAlpha * 0.62 * inspectionFade;
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#155bae";
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(contact.x, contact.y, compact ? 2.2 : 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      path(
        ROUTE_THREE_CURVE,
        "#155bae",
        routeThreeWidth,
        routeThreeAlpha * routeThreeEnvelopeProgress * inspectionFade,
      );

      if (selectedBranch) {
        path(selectedBranch.branch, "#155bae", routeThreeWidth, 0.98);
        const anchor = map(selectedBranch.branch[0]);
        const end = map(selectedBranch.branch.at(-1)!);
        const optimal = map(ROUTE_THREE_CONTACT_POINTS[selectedBranch.branchIndex]);
        const optimalIsEnd = Math.hypot(optimal.x - end.x, optimal.y - end.y) < 0.5;
        ctx.save();
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#155bae";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(anchor.x, anchor.y, compact ? 3.2 : 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#fff";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(optimal.x, optimal.y, compact ? 4.1 : 4.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#155bae";
        ctx.beginPath();
        ctx.arc(end.x, end.y, compact ? 3.4 : 4.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `650 ${compact ? 8 : 9}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.textBaseline = "middle";
        ctx.fillText(copy.chart.start, anchor.x + 9, anchor.y + 11);
        if (optimalIsEnd) {
          ctx.fillText(copy.chart.optimalEnd, end.x + 9, end.y - 9);
        } else {
          ctx.fillText(copy.chart.optimal, optimal.x + 9, optimal.y - 9);
          ctx.fillText(copy.chart.end, end.x + 9, end.y - 9);
        }
        ctx.restore();
      }
    } else {
      animatedPath(
        ROUTE_THREE_CURVE,
        "#155bae",
        routeThreeWidth,
        routeThreeAlpha,
        routeThreeEnvelopeProgress,
        routeThreeIsDrawing,
      );
    }

    const baseEnd = map(BASE_CURVE.at(-1)!);
    const routeOneEnd = map(ROUTE_ONE_EXTENSION.at(-1)!);
    const routeThreeEnd = map(ROUTE_THREE_CURVE.at(-1)!);

    if (routeThreeFocus > 0.2 && routeThreeEnvelopeProgress > 0.65) {
      ctx.save();
      ctx.globalAlpha = routeThreeFocus * 0.65 * terminalReveal(routeThreeEnvelopeProgress) * inspectionFade;
      ctx.lineWidth = 1.3;
      ctx.setLineDash([4, 7]);
      ctx.strokeStyle = "#155bae";
      ctx.beginPath();
      ctx.moveTo(routeThreeEnd.x, routeThreeEnd.y);
      ctx.lineTo(routeThreeEnd.x, baseEnd.y);
      ctx.stroke();
      ctx.restore();
    }

    const dot = (point: { x: number; y: number }, color: string, alpha: number, radius = 5) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const routeOneTerminalAlpha = routeOneIsDrawing
      ? routeOneAlpha * terminalReveal(routeOneExtensionProgress) * inspectionFade
      : routeOneAlpha * inspectionFade;
    const routeThreeTerminalAlpha = routeThreeIsDrawing
      ? routeThreeAlpha * terminalReveal(routeThreeEnvelopeProgress) * inspectionFade
      : routeThreeAlpha * inspectionFade;
    const routeTwoTerminalAlpha = routeTwoIsDrawing
      ? Math.max(overview, routeTwoFocus) * 0.95 * terminalReveal(routeTwoProgress) * inspectionFade
      : 0;
    const baselineTerminalAlpha = baselineIsDrawing
      ? baselineAlpha * terminalReveal(currentFrontierProgress) * inspectionFade
      : baselineAlpha * inspectionFade;

    dot(routeOneEnd, "#7b3a8a", routeOneTerminalAlpha);
    dot(routeThreeEnd, "#155bae", routeThreeTerminalAlpha);

    // Route 2 terminates at the exact same coordinate as the black frontier.
    ctx.save();
    ctx.globalAlpha = routeTwoTerminalAlpha;
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#5f9f47";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(baseEnd.x, baseEnd.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    dot(baseEnd, "#1d1d1f", baselineTerminalAlpha, 4);

    // Staggered heads travel along the existing curves, leaving a fading
    // trail behind them. The reference curves remain readable throughout.
    const ambientTime = ambientTimeRef.current;
    const ambientClock = ambientTime != null && stageRef.current === 0 && ambientVisibleSinceRef.current
      ? ambientTime - ambientVisibleSinceRef.current
      : null;
    if (ambientClock != null) {
      const legs = travelerLegs.map((leg) => {
        const pixels = leg.points.map(map);
        const positions = [0];
        let length = 0;
        for (let index = 0; index < pixels.length - 1; index += 1) {
          length += Math.hypot(pixels[index + 1].x - pixels[index].x, pixels[index + 1].y - pixels[index].y);
          positions.push(length);
        }
        return { leg, pixels, positions, length, duration: Math.max(length / TRAVELER_SPEED, TRAVELER_MIN_WINDOW) };
      });
      const cycle = Math.max(...legs.map(({ duration }, index) => duration + index * TRAVELER_STAGGER)) + TRAVELER_SETTLE_TIME + 0.35;
      const cycleTime = ambientClock % cycle;
      legs.forEach(({ leg, pixels, positions, length, duration }, index) => {
        const local = cycleTime - index * TRAVELER_STAGGER;
        if (local < 0 || local >= duration + TRAVELER_SETTLE_TIME) return;
        const phase = clamp(local / duration);
        const motion = travelerMotion(phase);
        const center = motion.position * length;
        const speed = clamp(motion.velocity / 3.5);
        const entrance = smoothStep(local / 0.18);
        // Let the head merge into the endpoint first; the remaining trail
        // settles behind it, with zero-slope fades instead of a hard cutoff.
        const headFade = smoothStep((local - duration + 0.25) / 1.05);
        const trailFade = smoothStep((local - duration) / TRAVELER_SETTLE_TIME);
        const headAlpha = entrance * (1 - headFade);
        const trailAlpha = entrance * (1 - trailFade);
        // A short history of the head's position gives the tail inertia:
        // it stretches during the sweep and gathers as the head slows down.
        const pastPosition = travelerMotion((local - 0.18) / duration).position;
        const trailLength = Math.min(compact ? 90 : 150, 8 + (motion.position - pastPosition) * length)
          * (1 - 0.8 * trailFade);
        let head = pixels[0];
        ctx.save();
        ctx.strokeStyle = leg.color;
        ctx.lineCap = "round";
        for (let i = 0; i < positions.length - 1; i += 1) {
          if (positions[i] > center) break;
          const fraction = clamp((center - positions[i]) / Math.max(0.001, positions[i + 1] - positions[i]));
          const end = {
            x: pixels[i].x + (pixels[i + 1].x - pixels[i].x) * fraction,
            y: pixels[i].y + (pixels[i + 1].y - pixels[i].y) * fraction,
          };
          head = end;
          const strength = clamp(1 - (center - positions[i]) / trailLength);
          if (!strength) continue;
          ctx.beginPath();
          ctx.moveTo(pixels[i].x, pixels[i].y);
          ctx.lineTo(end.x, end.y);
          ctx.globalAlpha = trailAlpha * strength * 0.14;
          ctx.lineWidth = (compact ? 7 : 9) + speed * 5;
          ctx.stroke();
          ctx.globalAlpha = trailAlpha * strength * 0.9;
          ctx.lineWidth = baseWidth + 1.5;
          ctx.stroke();
        }
        const haloRadius = 10 + speed * 7;
        const halo = ctx.createRadialGradient(head.x, head.y, 2, head.x, head.y, haloRadius);
        halo.addColorStop(0, leg.color + "66");
        halo.addColorStop(1, leg.color + "00");
        ctx.globalAlpha = headAlpha;
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(head.x, head.y, haloRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = leg.color;
        ctx.beginPath();
        ctx.arc(head.x, head.y, compact ? 4 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(head.x, head.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    const fontFamily = getComputedStyle(document.body).fontFamily;
    // Axis labels share the canvas bounds and plot geometry with the axes.
    ctx.save();
    ctx.font = `500 10px ${fontFamily}`;
    ctx.fillStyle = "#86868b";
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(copy.chart.cost, plot.right + 10, plot.bottom + 22);
    ctx.translate(plot.left - (compact ? 20 : 30), (plot.top + plot.bottom) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText(copy.chart.intelligence, 0, 0);
    ctx.restore();

    ctx.font = `600 ${compact ? 10 : 11}px ${fontFamily}`;
    ctx.textBaseline = "middle";
    const label = (text: string, point: Point, offsetX: number, offsetY: number, color: string, alpha: number) => {
      const position = map(point);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(position.x, position.y);
      ctx.lineTo(position.x + offsetX * 0.72, position.y + offsetY * 0.72);
      ctx.stroke();
      const textWidth = ctx.measureText(text).width;
      ctx.fillStyle = "rgba(255, 255, 255, .92)";
      ctx.fillRect(position.x + offsetX - 4, position.y + offsetY - 8, textWidth + 8, 16);
      ctx.fillStyle = color;
      ctx.fillText(text, position.x + offsetX, position.y + offsetY);
      ctx.restore();
    };

    label(
      copy.chart.current,
      BASE_CURVE[91],
      16,
      22,
      "#1d1d1f",
      animatedAlpha(baselineAlpha * inspectionFade, currentFrontierProgress, baselineIsDrawing, 0.68),
    );
    label(copy.chart.routeOne, ROUTE_ONE_EXTENSION.at(-1)!, -62, -18, "#7b3a8a", routeOneTerminalAlpha);
    label(
      copy.chart.routeTwo,
      routeTwoRenderedCurve[70],
      compact ? -32 : -58,
      -17,
      "#467d32",
      animatedAlpha(routeTwoAlpha * inspectionFade, routeTwoProgress, routeTwoIsDrawing, 0.48),
    );
    label(
      copy.chart.routeThree,
      ROUTE_THREE_CURVE.at(-1)!,
      compact ? -55 : 14,
      compact ? -16 : -2,
      "#155bae",
      routeThreeTerminalAlpha,
    );

    if (routeTwoFocus > 0.45 && routeTwoProgress > 0.78) {
      ctx.save();
      ctx.globalAlpha = routeTwoFocus * terminalReveal(routeTwoProgress);
      ctx.fillStyle = "#467d32";
      ctx.textAlign = "right";
      ctx.fillText(copy.chart.sameEndpoint, baseEnd.x - 14, baseEnd.y - 14);
      ctx.restore();
    }
  }, [copy]);

  useEffect(() => {
    stageRef.current = -1;
    lineAnimationRef.current = 0;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const projectsSection = document.getElementById("projects");

    const animateStage = (nextStage: number, nextFocus: number[]) => {
      if (lineAnimationRef.current) cancelAnimationFrame(lineAnimationRef.current);

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const nextReveal = stages.map(() => 1);
      if (reducedMotion) {
        revealRef.current = nextReveal;
        drawChart(nextFocus, nextReveal);
        lineAnimationRef.current = 0;
        return;
      }

      nextReveal[nextStage] = 0;
      revealRef.current = [...nextReveal];
      drawChart(nextFocus, nextReveal);
      const startedAt = performance.now();
      const duration = nextStage === 3 ? 5600 : 2000;

      const tick = (now: number) => {
        const elapsed = clamp((now - startedAt) / duration);
        const eased = easeInOutCubic(elapsed);
        nextReveal[nextStage] = nextStage === 3 ? elapsed : eased;
        revealRef.current = [...nextReveal];
        drawChart(nextFocus, nextReveal);

        if (elapsed < 1) {
          lineAnimationRef.current = requestAnimationFrame(tick);
        } else {
          lineAnimationRef.current = 0;
        }
      };

      lineAnimationRef.current = requestAnimationFrame(tick);
    };

    const stopAmbient = () => {
      if (ambientFrameRef.current) cancelAnimationFrame(ambientFrameRef.current);
      ambientFrameRef.current = 0;
      ambientVisibleSinceRef.current = 0;
      if (ambientTimeRef.current != null) {
        ambientTimeRef.current = null;
        if (!lineAnimationRef.current && stageRef.current >= 0) {
          drawChart(stages.map((_, index) => index === stageRef.current ? 1 : 0), revealRef.current);
        }
      }
    };

    const startAmbient = () => {
      if (ambientFrameRef.current) return;
      if (motionPreference.matches || document.hidden) return;
      const startedAt = performance.now();
      ambientTimeRef.current = 0;

      const tick = (now: number) => {
        ambientTimeRef.current = (now - startedAt) / 1000;
        // While the overview reveal is still drawing, that loop owns the
        // canvas. The ambient cycle starts once the reveal completes.
        if (!lineAnimationRef.current && (revealRef.current[0] ?? 0) >= 1) {
          if (!ambientVisibleSinceRef.current) {
            ambientVisibleSinceRef.current = ambientTimeRef.current;
          }
          drawChart(stages.map((_, index) => index === 0 ? 1 : 0), revealRef.current);
        }
        ambientFrameRef.current = requestAnimationFrame(tick);
      };

      ambientFrameRef.current = requestAnimationFrame(tick);
    };

    const update = (forceDraw = false) => {
      frameRef.current = 0;
      // Once project cards enter view, leave the rest of the page freely scrollable.
      document.documentElement.classList.toggle("home-free-scroll",
        !!projectsSection && projectsSection.getBoundingClientRect().top < window.innerHeight);
      const chapters = stepRefs.current.map(element => element?.querySelector('.story-copy')?.getBoundingClientRect());
      if (chapters.some(rect => !rect)) return;
      const languageOffset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-language-offset')) || 0;
      const readingTop = window.innerWidth < 980
        ? (canvasRef.current?.parentElement?.getBoundingClientRect().bottom ?? window.innerHeight / 2) + 20
        : languageOffset + 76;
      const nextStage = selectStoryChapter(chapters as DOMRect[], readingTop, window.innerHeight - 32, stageRef.current);
      const nextFocus = stages.map((_, index) => index === nextStage ? 1 : 0);

      if (stageRef.current !== nextStage) {
        canvasRef.current?.style.removeProperty("cursor");
        if (nextStage !== 3) {
          routeThreeHoverRef.current = null;
        }
        stageRef.current = nextStage;
        setActiveStage((current) => current === nextStage ? current : nextStage);
        animateStage(nextStage, nextFocus);
        if (nextStage === 0) {
          startAmbient();
        } else {
          stopAmbient();
        }
      } else if (forceDraw && !lineAnimationRef.current) {
        drawChart(nextFocus, revealRef.current);
      }
    };

    const onScroll = () => {
      if (frameRef.current) return;
      frameRef.current = requestAnimationFrame(() => update());
    };
    const onResize = () => update(true);
    const onMotionChange = () => {
      stopAmbient();
      if (lineAnimationRef.current) cancelAnimationFrame(lineAnimationRef.current);
      lineAnimationRef.current = 0;
      revealRef.current = stages.map(() => 1);
      update(true);
      if (stageRef.current === 0) startAmbient();
    };
    const onVisibilityChange = () => {
      if (document.hidden) stopAmbient();
      else if (stageRef.current === 0) startAmbient();
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    motionPreference.addEventListener("change", onMotionChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.documentElement.classList.remove("home-free-scroll");
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      motionPreference.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (lineAnimationRef.current) cancelAnimationFrame(lineAnimationRef.current);
      stopAmbient();
      frameRef.current = 0;
      lineAnimationRef.current = 0;
    };
  }, [drawChart]);

  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!targets.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((element) => element.classList.add("is-revealed"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.2 });

    targets.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let pointerDown: { pointerId: number; x: number; y: number } | null = null;

    const redrawRouteThree = () => {
      if (stageRef.current !== 3 || lineAnimationRef.current) return;
      drawChart(stages.map((_, index) => index === 3 ? 1 : 0), revealRef.current);
    };

    const clearBranchSelection = () => {
      if (!routeThreeHoverRef.current) return;
      routeThreeHoverRef.current = null;
      redrawRouteThree();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (stageRef.current === 0) {
        clearBranchSelection();
        if (event.pointerType === "touch") {
          canvas.style.removeProperty("cursor");
        } else {
          const route = getOverviewRouteAtPoint(canvas, event.clientX, event.clientY, event.pointerType);
          canvas.style.cursor = route ? "pointer" : "default";
        }
        return;
      }

      canvas.style.removeProperty("cursor");
      if (
        event.pointerType === "touch"
        || stageRef.current !== 3
        || (revealRef.current[3] ?? 0) < 0.12
      ) {
        clearBranchSelection();
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const plot = getPlot(rect.width, rect.height);
      const pointer = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      const plotWidth = plot.right - plot.left;
      const plotHeight = plot.bottom - plot.top;

      let nearestBranchIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      ROUTE_THREE_BRANCHES.forEach((branch, branchIndex) => {
        for (let segmentIndex = 0; segmentIndex < branch.length - 1; segmentIndex += 1) {
          const from = branch[segmentIndex];
          const to = branch[segmentIndex + 1];
          const fromX = plot.left + from.x * plotWidth;
          const fromY = plot.top + from.y * plotHeight;
          const toX = plot.left + to.x * plotWidth;
          const toY = plot.top + to.y * plotHeight;
          const deltaX = toX - fromX;
          const deltaY = toY - fromY;
          const squaredLength = deltaX * deltaX + deltaY * deltaY;
          const segmentProgress = squaredLength
            ? clamp(((pointer.x - fromX) * deltaX + (pointer.y - fromY) * deltaY) / squaredLength)
            : 0;
          const nearestX = fromX + deltaX * segmentProgress;
          const nearestY = fromY + deltaY * segmentProgress;
          const distance = Math.hypot(pointer.x - nearestX, pointer.y - nearestY);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestBranchIndex = branchIndex;
          }
        }
      });

      if (nearestDistance > (window.innerWidth < 980 ? 26 : 22)) {
        clearBranchSelection();
        return;
      }

      const branch = ROUTE_THREE_BRANCHES[nearestBranchIndex];
      if (routeThreeHoverRef.current?.branchIndex === nearestBranchIndex) return;

      routeThreeHoverRef.current = {
        branch,
        branchIndex: nearestBranchIndex,
      };
      redrawRouteThree();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (stageRef.current !== 0) return;
      pointerDown = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!pointerDown || pointerDown.pointerId !== event.pointerId || stageRef.current !== 0) {
        pointerDown = null;
        return;
      }

      const travel = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
      pointerDown = null;
      const tapTolerance = event.pointerType === "touch" ? 24 : 10;
      if (travel > tapTolerance) return;

      const route = getOverviewRouteAtPoint(canvas, event.clientX, event.clientY, event.pointerType);
      if (route) scrollToStoryStage(route);
    };

    const clearPointerDown = () => {
      pointerDown = null;
    };

    const onPointerLeave = () => {
      clearPointerDown();
      canvas.style.removeProperty("cursor");
      clearBranchSelection();
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", clearPointerDown);
    canvas.addEventListener("pointerleave", onPointerLeave);
    return () => {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", clearPointerDown);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.style.removeProperty("cursor");
    };
  }, [drawChart]);

  return (
    <main>
      <a className="skip-link" href="#scale-story">{copy.skip}</a>


      <section className="scale-story" id="scale-story">
        <figure
          className={`chart-sticky ${activeStage === 3 ? "is-route-three" : ""}`}
          role="group"
          aria-labelledby="chart-title chart-description"
        >
          <h2 className="sr-only" id="chart-title">{copy.chartTitle}</h2>
          <canvas ref={canvasRef} aria-hidden="true" />
          <figcaption className="sr-only" id="chart-description">{copy.axes} {chartDescriptions[activeStage]}</figcaption>
        </figure>

        <div className="story-steps">
          {stages.map((stage, index) => (
            <article
              className={`story-step ${activeStage === index ? "is-active" : ""}`}
              id={stage.id}
              key={stage.id}
              ref={(element) => { stepRefs.current[index] = element; }}
              aria-current={activeStage === index ? "step" : undefined}
            >
              <div className={`story-copy story-copy-${index}`}>
                <div className="story-meta">
                  <div className="story-stage-label">{stage.label}</div>
                </div>
                {index !== 0 && <p className="story-eyebrow">{stage.eyebrow}</p>}
                {index === 0 ? <h1>{stage.title}</h1> : <h2>{stage.title}</h2>}
                {index === 0 && <p className="story-subtitle">{stage.eyebrow}</p>}
                <div className="story-body">
                  {stage.body.split("\n\n").map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex}><StoryBody text={paragraph} locale={locale} /></p>
                  ))}
                </div>

                {index === 0 && (
                  <div className="overview-legend" aria-label={copy.legendLabel}>
                    <a href="#route-one"><i className="route-one-dot" />{copy.legend[0]}</a>
                    <a href="#route-two"><i className="route-two-dot" />{copy.legend[1]}</a>
                    <a href="#route-three"><i className="route-three-dot" />{copy.legend[2]}</a>
                  </div>
                )}
                {index === 1 && (
                  <div className="variable-row" aria-label={copy.variablesLabel}>
                    <span>{copy.variables[0]}</span><i>+</i><span>{copy.variables[1]}</span><i>+</i><span>{copy.variables[2]}</span>
                  </div>
                )}
                {(index === 2 || index === 3) && (
                  <div className="project-pills" aria-label={index === 2 ? copy.routeTwoProjects : copy.routeThreeProjects}>
                    {projectCards.filter(project => project.route === (index === 2 ? "02" : "03")).map(project => (
                      <ProjectLink key={project.slug} name={project.name} url={projectPath(project, locale, base)} />
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="projects-section" id="projects" aria-labelledby="projects-title">
        <div className="projects-inner">
          <p className="projects-eyebrow" data-reveal>{copy.research}</p>
          <h2 className="projects-title" id="projects-title" data-reveal>{copy.projectsTitle}</h2>
          <p className="projects-lead" data-reveal>
            {copy.projectsLead}
          </p>
          <div className="projects-grid">
            {projectsByRoute.map((project) => {
              const category = projectCategories.find((item) => item.id === project.category);
              return (
                <a
                  className="project-card"
                  data-reveal
                  href={projectPath(project, locale, base)}
                  key={project.name}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="project-card-top">
                    <span className="project-card-icon">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={project.logo} alt="" />
                    </span>
                    <span className={`project-card-route ${routeClasses[project.route]}`}>
                      {copy.routes[project.route]} · {category && localize(category, locale).shortLabel}
                    </span>
                  </span>
                  <strong className="project-card-name">{project.name}</strong>
                  <span className="project-card-desc">{localize(project, locale).description}</span>
                  <span className="project-card-cta">
                    {copy.projectPage} <span aria-hidden="true">↗</span>
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </section>

    </main>
  );
}
