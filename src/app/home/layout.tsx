import type { Metadata } from "next";
import { AuthGuard } from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "Biblioteca — MindEase",
  description: "Organize seus materiais, estude no seu ritmo e mantenha o foco.",
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
