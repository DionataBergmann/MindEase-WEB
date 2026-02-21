"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button, Heading, Text } from "@/components/atoms";

export function CTASection() {
  return (
    <section className="py-20 text-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="max-w-xl mx-auto px-6"
      >
        <Heading level={2} variant="section" className="mb-4">
          Pronto para estudar com mais calma?
        </Heading>
        <Text variant="body" className="mb-8 block text-foreground">
          Crie sua conta gratuitamente e comece agora.
        </Text>
        <Button size="lg" asChild>
          <Link href="/signup">Criar conta gratuita</Link>
        </Button>
      </motion.div>
    </section>
  );
}
