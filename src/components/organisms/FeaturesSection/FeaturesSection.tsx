"use client";

import { motion } from "framer-motion";
import { BookOpen, Brain, LayoutList, Sparkles } from "lucide-react";
import { FeatureCard } from "@/components/molecules";
import { Heading } from "@/components/atoms";

const features = [
  {
    icon: BookOpen,
    title: "Upload de PDFs",
    description: "Envie seus materiais e organize tudo em projetos de estudo.",
  },
  {
    icon: LayoutList,
    title: "Kanban de estudo",
    description:
      "Visualize tópicos em colunas simples: estudar, em progresso, concluído.",
  },
  {
    icon: Brain,
    title: "Modo foco",
    description: "Estude um tópico por vez, sem distrações, no seu ritmo.",
  },
  {
    icon: Sparkles,
    title: "IA para aprender",
    description: "Resumos, flashcards e quizzes gerados automaticamente.",
  },
];

export function FeaturesSection() {
  return (
    <section className="bg-secondary/40 py-20">
      <div className="max-w-6xl mx-auto px-6">
        <Heading level={2} variant="sectionCenter" className="mb-12">
          Como funciona
        </Heading>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * i }}
            >
              <FeatureCard
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
