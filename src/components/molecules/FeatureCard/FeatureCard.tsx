import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, IconBox } from "@/components/atoms";
import { cn } from "@/lib/utils";

export interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export function FeatureCard({ icon, title, description, className }: FeatureCardProps) {
  return (
    <Card className={cn("p-6", className)}>
      <IconBox icon={icon} className="mb-4" />
      <CardHeader className="p-0">
        <CardTitle className="mb-2">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );
}
