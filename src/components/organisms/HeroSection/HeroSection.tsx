"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button, Heading, Text } from "@/components/atoms";
import heroImage from "@/assets/hero-illustration.jpg";

export function HeroSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-16 pb-24">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Heading level={1} variant="hero" className="mb-0">
            Estudo sem <span className="text-primary">sobrecarga</span>
          </Heading>
          <Text variant="lead" className="mt-6">
            Organize seus materiais, estude no seu ritmo e mantenha o foco.
            Pensado para quem precisa de clareza e calma ao aprender.
          </Text>
          <div className="mt-8 flex gap-4">
            <Button size="lg" asChild>
              <Link href="/signup">Começar agora</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Já tenho conta</Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="rounded-2xl overflow-hidden shadow-lg aspect-[4/3] relative"
        >
          <Image
            src={heroImage}
            alt="Ilustração de estudo calmo e focado"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        </motion.div>
      </div>
    </section>
  );
}
