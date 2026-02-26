import type { Metadata } from "next";
import { AuthGuard } from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "Projeto — MindEase",
  description: "Resumo e tópicos do projeto de estudo.",
};

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
