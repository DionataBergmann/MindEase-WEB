import * as React from "react";
import { cn } from "@/lib/utils";

const TEXT_VARIANTS = {
  lead: "text-lead",
  body: "text-body",
  muted: "text-muted",
  small: "text-small",
  smallMuted: "text-small-muted",
  footer: "text-footer",
  link: "text-link",
} as const;

export type TextVariant = keyof typeof TEXT_VARIANTS;

export interface TextPrimitiveProps
  extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: TextVariant;
  as?: "p" | "span";
}

const TextPrimitive = React.forwardRef<HTMLParagraphElement, TextPrimitiveProps>(
  ({ variant = "body", as: Tag = "p", className, ...props }, ref) =>
    React.createElement(Tag, {
      ref,
      className: cn(TEXT_VARIANTS[variant], className),
      ...props,
    })
);
TextPrimitive.displayName = "TextPrimitive";

export { TextPrimitive };
