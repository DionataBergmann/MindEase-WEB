import * as React from "react";
import { cn } from "@/lib/utils";

const HEADING_VARIANTS = {
  hero: "heading-hero",
  section: "heading-section",
  sectionCenter: "heading-section-center",
  card: "heading-card",
  nav: "heading-nav",
  auth: "heading-auth",
} as const;

const HEADING_TAGS = { 1: "h1", 2: "h2", 3: "h3", 4: "h4", 5: "h5", 6: "h6" } as const;

export type HeadingVariant = keyof typeof HEADING_VARIANTS;
export type HeadingLevel = keyof typeof HEADING_TAGS;

export interface HeadingPrimitiveProps
  extends Omit<React.HTMLAttributes<HTMLHeadingElement>, "color"> {
  level?: HeadingLevel;
  variant?: HeadingVariant;
}

const HeadingPrimitive = React.forwardRef<
  HTMLHeadingElement,
  HeadingPrimitiveProps
>(({ level = 1, variant = "section", className, children, ...props }, ref) => {
  const Tag = HEADING_TAGS[level];
  return React.createElement(
    Tag,
    { ref, className: cn(HEADING_VARIANTS[variant], className), ...props },
    children
  );
});
HeadingPrimitive.displayName = "HeadingPrimitive";

export { HeadingPrimitive };
