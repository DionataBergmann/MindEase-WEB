import type { Metadata } from "next";
import { AuthGuard } from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "Revisão — MindEase",
  description: "Revise seus cards no momento certo.",
};

export default function ReviewLayout({
  children,
}: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
