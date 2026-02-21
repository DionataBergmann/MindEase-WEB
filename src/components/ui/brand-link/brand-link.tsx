import Link from "next/link";
import { cn } from "@/lib/utils";

const BRAND_LINK_SIZES = { nav: "brand-link--nav", auth: "brand-link--auth" } as const;

export type BrandLinkSize = keyof typeof BRAND_LINK_SIZES;

export interface BrandLinkPrimitiveProps {
  href?: string;
  size?: BrandLinkSize;
  className?: string;
}

function BrandLinkPrimitive({
  href = "/",
  size = "nav",
  className,
}: BrandLinkPrimitiveProps) {
  return (
    <Link href={href} className={cn(BRAND_LINK_SIZES[size], className)}>
      MindEase
    </Link>
  );
}

BrandLinkPrimitive.displayName = "BrandLinkPrimitive";

export { BrandLinkPrimitive };
