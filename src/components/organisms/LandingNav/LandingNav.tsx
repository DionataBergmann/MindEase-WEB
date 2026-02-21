import Link from "next/link";
import { Button, BrandLink } from "@/components/atoms";

export function LandingNav() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
      <BrandLink size="nav" />
      <div className="flex gap-3">
        <Button variant="ghost" asChild>
          <Link href="/login">Entrar</Link>
        </Button>
        <Button asChild>
          <Link href="/signup">Criar conta</Link>
        </Button>
      </div>
    </nav>
  );
}
