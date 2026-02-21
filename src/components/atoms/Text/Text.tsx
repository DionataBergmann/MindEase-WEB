import { forwardRef } from "react";
import { TextPrimitive, type TextVariant } from "@/components/ui/text";

export type { TextVariant };

export interface TextProps
  extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: TextVariant;
  as?: "p" | "span";
}

export const Text = forwardRef<HTMLParagraphElement, TextProps>(
  (props, ref) => <TextPrimitive ref={ref} {...props} />
);

Text.displayName = "Text";
