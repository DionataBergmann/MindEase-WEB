import { forwardRef } from "react";
import * as UI from "@/components/ui/card";

export type CardProps = React.HTMLAttributes<HTMLDivElement>;
export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;
export type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;
export type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;
export type CardContentProps = React.HTMLAttributes<HTMLDivElement>;
export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

export const Card = forwardRef<HTMLDivElement, CardProps>((props, ref) => (
  <UI.Card ref={ref} {...props} />
));
Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>((props, ref) => (
  <UI.CardHeader ref={ref} {...props} />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>((props, ref) => (
  <UI.CardTitle ref={ref} {...props} />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>((props, ref) => (
  <UI.CardDescription ref={ref} {...props} />
));
CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>((props, ref) => (
  <UI.CardContent ref={ref} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>((props, ref) => (
  <UI.CardFooter ref={ref} {...props} />
));
CardFooter.displayName = "CardFooter";
