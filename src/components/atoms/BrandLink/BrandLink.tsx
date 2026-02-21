import {
  BrandLinkPrimitive,
  type BrandLinkSize,
} from "@/components/ui/brand-link";

export type { BrandLinkSize };

export interface BrandLinkProps {
  href?: string;
  size?: BrandLinkSize;
  className?: string;
}

export function BrandLink(props: BrandLinkProps) {
  return <BrandLinkPrimitive {...props} />;
}
