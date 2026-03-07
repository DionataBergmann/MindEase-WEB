import type { Metadata } from "next";
import { DM_Sans, Nunito } from "next/font/google";
import "./globals.css";
import { PreferencesApply } from "@/components/PreferencesApply";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });

export const metadata: Metadata = {
  title: "MindEase — Estudo sem sobrecarga",
  description:
    "Organize seus materiais, estude no seu ritmo e mantenha o foco. Pensado para quem precisa de clareza e calma ao aprender.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${dmSans.variable} ${nunito.variable}`}>
      <body className="min-h-screen bg-background text-foreground font-body">
        <PreferencesApply />
        {children}
      </body>
    </html>
  );
}
