"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { BrandLink, Button, Heading, Input, Text } from "@/components/atoms";
import { getFirebaseAuth } from "@/lib/firebase";
import loginIllustration from "@/assets/login-illustration.png";
import { signupSchema, type SignupFormData } from "./signupSchema";

export function SignupForm() {
  const router = useRouter();
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: SignupFormData) {
    setFirebaseError(null);

    const auth = getFirebaseAuth();
    if (!auth) {
      setFirebaseError("Firebase não está configurado. Verifique as variáveis de ambiente.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      if (data.name?.trim() && userCredential.user) {
        await updateProfile(userCredential.user, { displayName: data.name.trim() });
      }
      router.push("/home");
      router.refresh();
    } catch (err: unknown) {
      const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : "";
      if (code === "auth/email-already-in-use") {
        setFirebaseError("Este e-mail já está em uso. Tente fazer login.");
      } else if (code === "auth/weak-password") {
        setFirebaseError("A senha é muito fraca. Use no mínimo 6 caracteres.");
      } else if (code === "auth/invalid-email") {
        setFirebaseError("E-mail inválido.");
      } else {
        setFirebaseError("Não foi possível criar a conta. Tente novamente.");
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
          Criar conta
        </Heading>
        <Text variant="body" className="text-foreground text-center block mb-5">
          Preencha os dados abaixo para começar.
        </Text>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
              Nome (opcional)
            </label>
            <Input
              id="name"
              type="text"
              placeholder="Seu nome"
              {...register("name")}
              disabled={isSubmitting}
              autoComplete="name"
            />
          </div>
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
              placeholder="Mínimo 6 caracteres"
              {...register("password")}
              disabled={isSubmitting}
              autoComplete="new-password"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1.5">
              Confirmar senha
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repita a senha"
              {...register("confirmPassword")}
              disabled={isSubmitting}
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
          {firebaseError && (
            <p className="text-sm text-destructive font-medium" role="alert">
              {firebaseError}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Criando conta…" : "Criar conta"}
          </Button>
        </form>
        <p className="mt-6 text-center">
          <Text variant="small" as="span" className="text-foreground">
            Já tem conta?{" "}
          </Text>
          <Button variant="link" asChild className="p-0 h-auto font-medium">
            <Link href="/login">Entrar</Link>
          </Button>
        </p>
      </div>
    </div>
  );
}
