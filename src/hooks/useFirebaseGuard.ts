"use client";

import { useCallback } from "react";
import type { User } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb, getCurrentUserWhenReady } from "@/lib/firebase";

export type UseFirebaseGuardOptions = {
  loginMessage?: string;
  firebaseMessage?: string;
};

/**
 * Retorna uma função guard que verifica user + db e chama setError em caso de falha.
 * Útil antes de operações que precisam de Firebase (criar/atualizar projeto).
 */
export function useFirebaseGuard(
  setError: (message: string | null) => void,
  options: UseFirebaseGuardOptions = {}
): () => Promise<{ user: User; db: Firestore } | null> {
  const loginMessage = options.loginMessage ?? "Faça login para continuar.";
  const firebaseMessage = options.firebaseMessage ?? "Firebase não está configurado.";

  return useCallback(async () => {
    const auth = getFirebaseAuth();
    const user = await getCurrentUserWhenReady(auth);
    if (!user) {
      setError(loginMessage);
      return null;
    }
    const db = getFirestoreDb();
    if (!db) {
      setError(firebaseMessage);
      return null;
    }
    return { user, db };
  }, [loginMessage, firebaseMessage, setError]);
}
