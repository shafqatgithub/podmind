import Image from "next/image";
import { cn } from "@podmind/ui";

/**
 * PodMind AI logo.
 *
 * Two things the source artwork needed before it could ship:
 *
 * 1) It was bright art on a black field. Luminance is mapped to alpha so the
 *    background is genuinely transparent — a black-backed PNG would read as a
 *    hole punched in the #050816 app background.
 *
 * 2) The wordmark's "Pod" is white, which is invisible on the light theme.
 *    A light variant recolours the unsaturated white artwork to deep navy
 *    while leaving the blue/purple gradient letters untouched.
 *
 * Both variants are rendered and swapped with CSS rather than by reading the
 * theme in JavaScript, so the correct one paints on the first frame and never
 * flashes the wrong logo during hydration.
 */

function ThemedImage({
  darkSrc,
  lightSrc,
  alt,
  width,
  height,
  className,
  style,
  priority,
}: {
  darkSrc: string;
  lightSrc: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
}) {
  return (
    <>
      <Image
        src={lightSrc}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        style={style}
        className={cn("block select-none dark:hidden", className)}
      />
      <Image
        src={darkSrc}
        alt=""
        aria-hidden
        width={width}
        height={height}
        priority={priority}
        style={style}
        className={cn("hidden select-none dark:block", className)}
      />
    </>
  );
}

export function LogoMark({
  className,
  size = 32,
  priority = false,
}: {
  className?: string;
  size?: number;
  priority?: boolean;
}) {
  return (
    <ThemedImage
      darkSrc="/logo-mark.png"
      lightSrc="/logo-mark-light.png"
      alt=""
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0", className)}
    />
  );
}

/** Mark plus the PodMind AI wordmark — the standard header lockup. */
export function LogoLockup({
  className,
  markSize = 30,
  priority = false,
}: {
  className?: string;
  markSize?: number;
  priority?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={markSize} priority={priority} />
      <ThemedImage
        darkSrc="/logo-wordmark.png"
        lightSrc="/logo-wordmark-light.png"
        alt="PodMind AI"
        width={560}
        height={145}
        priority={priority}
        className="h-[22px] w-auto"
      />
    </span>
  );
}

/** Full stacked lockup with the tagline — auth screens and the landing hero. */
export function LogoFull({
  className,
  width = 260,
  priority = true,
}: {
  className?: string;
  width?: number;
  priority?: boolean;
}) {
  return (
    <ThemedImage
      darkSrc="/logo-full.png"
      lightSrc="/logo-full-light.png"
      alt="PodMind AI — Research Less. Create More."
      width={640}
      height={574}
      priority={priority}
      style={{ width, height: "auto" }}
      className={className}
    />
  );
}
