import type { Metadata } from "next";
import { AuthGuard } from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "Novo projeto — MindEase",
  description: "Envie um PDF e gere resumo e cards de estudo com IA.",
};

export default function NewProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
