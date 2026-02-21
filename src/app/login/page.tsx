import Link from "next/link";
import { BrandLink, Button, Text } from "@/components/atoms";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        <BrandLink href="/" size="auth" />
        <Text variant="muted" className="mt-6 block">
          Página de login em breve.
        </Text>
        <Button variant="link" asChild className="inline-block mt-4">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
}
