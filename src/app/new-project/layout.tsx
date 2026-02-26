import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Novo projeto — MindEase",
  description: "Envie um PDF e gere resumo e cards de estudo com IA.",
};

export default function NewProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
