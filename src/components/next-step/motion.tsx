"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

// Motion for The Next Step, all of it optional: nothing moves unless the
// user's system allows motion (prefers-reduced-motion: no-preference), and
// screen readers always get final values, never intermediate ones.

const MOTION_OK = "(prefers-reduced-motion: no-preference)";

function motionAllowed(): boolean {
  return typeof window !== "undefined" && window.matchMedia(MOTION_OK).matches;
}

// A number that counts up to its value on load. `to` is the text to end on
// ("97.2"); `from` is where it starts. Shows the final value straight away
// with reduced motion. The counting digits are hidden from screen readers.
export function CountUp({ to, from = 0, ms = 900 }: { to: string; from?: number; ms?: number }) {
  const target = Number.parseFloat(to);
  const decimals = to.includes(".") ? to.split(".")[1].length : 0;
  const [shown, setShown] = useState(() =>
    Number.isFinite(target) && motionAllowed() ? from : target,
  );

  useEffect(() => {
    if (!Number.isFinite(target) || !motionAllowed()) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - (1 - t) ** 3;
      setShown(from + (target - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, from, ms]);

  if (!Number.isFinite(target)) return <>{to}</>;
  return (
    <>
      <span aria-hidden="true">{shown.toFixed(decimals)}</span>
      <span className="sr-only">{to}</span>
    </>
  );
}

// A slow parallax for a background image: as its frame scrolls through the
// viewport, the image moves at `rate` of the scroll. Off with reduced motion
// (and it turns itself off if the setting changes while the page is open).
// Put `frameRef` on the frame and `imageRef` on the image.
export function useParallax<F extends HTMLElement, I extends HTMLElement>(
  rate = 0.15,
): { frameRef: RefObject<F | null>; imageRef: RefObject<I | null> } {
  const frameRef = useRef<F>(null);
  const imageRef = useRef<I>(null);
  useEffect(() => {
    const media = window.matchMedia(MOTION_OK);
    let frame = 0;
    const update = () => {
      frame = 0;
      const image = imageRef.current;
      const box = frameRef.current;
      if (!image || !box) return;
      if (!media.matches) {
        image.style.transform = "";
        return;
      }
      const r = box.getBoundingClientRect();
      const offset = (r.top + r.height / 2 - window.innerHeight / 2) * rate;
      image.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    media.addEventListener("change", update);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      media.removeEventListener("change", update);
      cancelAnimationFrame(frame);
    };
  }, [rate]);
  return { frameRef, imageRef };
}
