import type { Metadata } from "next";
import "./globals.css";
import { PreferencesApply } from "@/components/PreferencesApply";

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
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Nunito:ital,wght@0,200..1000;1,200..1000&display=swap"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground font-body">
        <PreferencesApply />
        {children}
      </body>
    </html>
  );
}
