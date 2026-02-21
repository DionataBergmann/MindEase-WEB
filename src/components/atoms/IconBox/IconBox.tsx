import { forwardRef } from "react";
import type { LucideIcon } from "lucide-react";
import { IconBoxPrimitive } from "@/components/ui/icon-box";

export interface IconBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon;
  iconClassName?: string;
}

export const IconBox = forwardRef<HTMLDivElement, IconBoxProps>(
  (props, ref) => <IconBoxPrimitive ref={ref} {...props} />
);

IconBox.displayName = "IconBox";
