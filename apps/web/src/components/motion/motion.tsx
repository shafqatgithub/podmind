"use client";

/**
 * Motion primitives — 05-Design-System §29 (Micro Interactions) + §30
 * (Reduced Motion Support). One orchestrated system, reused everywhere:
 * entrances stagger from a shared choreography; hover-lift is a single
 * variant; `MotionConfig reducedMotion="user"` honours OS settings globally.
 */

import * as React from "react";
import { cn } from "@podmind/ui";
import {
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  type Variants,
} from "framer-motion";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

/* ------------------------------------------------ shared choreography */

const EASE = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

/** Section that reveals when scrolled into view, staggering its children. */
export function Reveal({
  children,
  className,
  as = "div",
  amount = 0.2,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section";
  amount?: number;
}) {
  const Tag = as === "section" ? m.section : m.div;
  return (
    <Tag
      className={className}
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
    >
      {children}
    </Tag>
  );
}

/** Child item for Reveal / any stagger parent. */
export function Item({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    // h-full so a card inside a grid can fill its row. Without it the child's
    // own h-full has nothing to measure against and cards in a row end up
    // different heights whenever one has an extra line of text.
    <m.div className={cn("h-full", className)} variants={fadeUp}>
      {children}
    </m.div>
  );
}

/**
 * Stagger container that animates on mount rather than on scroll.
 *
 * Reveal is right for page content the reader scrolls to. It is wrong for
 * content that appears *because* the user just acted: gating that behind a
 * viewport threshold can leave a freshly generated result invisible until
 * the page is scrolled, which reads as "nothing happened".
 */
export function Appear({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <m.div className={className} variants={stagger} initial="hidden" animate="visible">
      {children}
    </m.div>
  );
}

/** Hover Lift (doc §29): subtle raise + spring press for cards. */
export function LiftCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <m.div
      className={cn("h-full", className)}
      variants={fadeUp}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.99 }}
    >
      {children}
    </m.div>
  );
}

/** Route-transition wrapper used by (app)/template.tsx. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      {children}
    </m.div>
  );
}

/** Animated number for dashboard stats. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }
    let frame: number;
    const start = performance.now();
    const duration = 800;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span className={className}>{display}</span>;
}
