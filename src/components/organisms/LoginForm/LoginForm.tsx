"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInWithEmailAndPassword } from "firebase/auth";
import { BrandLink, Button, Heading, Input, Text } from "@/components/atoms";
import { getFirebaseAuth } from "@/lib/firebase";
import loginIllustration from "@/assets/login-illustration.png";
import { loginSchema, type LoginFormData } from "./loginSchema";

export function LoginForm() {
  const router = useRouter();
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormData) {
    setFirebaseError(null);

    const auth = getFirebaseAuth();
    if (!auth) {
      setFirebaseError("Firebase não está configurado. Verifique as variáveis de ambiente.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        setFirebaseError("E-mail ou senha incorretos. Tente novamente.");
      } else if (code === "auth/user-not-found") {
        setFirebaseError("Não há conta com este e-mail. Crie uma conta.");
      } else if (code === "auth/invalid-email") {
        setFirebaseError("E-mail inválido.");
      } else if (code === "auth/too-many-requests") {
        setFirebaseError("Muitas tentativas. Aguarde um pouco e tente de novo.");
      } else {
        setFirebaseError("Não foi possível entrar. Tente novamente.");
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-0">
          <BrandLink href="/" size="auth" className="mb-0" />
          <Image
            src={loginIllustration}
            alt=""
            className="w-full max-w-[200px] h-auto"
            priority
          />
        </div>
        <Heading level={2} variant="auth" className="mb-1 text-center mt-0">
          Entrar
        </Heading>
        <Text variant="body" className="text-foreground text-center block mb-5">
          Use seu e-mail e senha para acessar.
        </Text>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
              E-mail
            </label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              {...register("email")}
              disabled={isSubmitting}
              autoComplete="email"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
              Senha
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Sua senha"
              {...register("password")}
              disabled={isSubmitting}
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          {firebaseError && (
            <p className="text-sm text-destructive font-medium" role="alert">
              {firebaseError}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Entrando…" : "Entrar"}
          </Button>
        </form>
        <p className="mt-6 text-center">
          <Text variant="small" as="span" className="text-foreground">
            Não tem conta?{" "}
          </Text>
          <Button variant="link" asChild className="p-0 h-auto font-medium">
            <Link href="/signup">Criar conta</Link>
          </Button>
        </p>
      </div>
    </div>
  );
}
