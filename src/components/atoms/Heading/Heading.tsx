import { forwardRef } from "react";
import {
  HeadingPrimitive,
  type HeadingVariant,
  type HeadingLevel,
} from "@/components/ui/heading";

export type { HeadingVariant, HeadingLevel };

export interface HeadingProps
  extends Omit<React.HTMLAttributes<HTMLHeadingElement>, "color"> {
  level?: HeadingLevel;
  variant?: HeadingVariant;
}

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  (props, ref) => <HeadingPrimitive ref={ref} {...props} />
);

Heading.displayName = "Heading";
