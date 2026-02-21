import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_BOX_CLASSES = { root: "icon-box", icon: "icon-box__icon" } as const;

export interface IconBoxPrimitiveProps
  extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon;
  iconClassName?: string;
}

const IconBoxPrimitive = React.forwardRef<HTMLDivElement, IconBoxPrimitiveProps>(
  ({ icon: Icon, iconClassName, className, ...props }, ref) => (
    <div ref={ref} className={cn(ICON_BOX_CLASSES.root, className)} {...props}>
      <Icon className={cn(ICON_BOX_CLASSES.icon, iconClassName)} />
    </div>
  )
);
IconBoxPrimitive.displayName = "IconBoxPrimitive";

export { IconBoxPrimitive };
