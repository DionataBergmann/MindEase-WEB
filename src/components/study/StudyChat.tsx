import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button, Input } from "@/components/atoms";

type ChatMessage = { role: "user" | "assistant"; content: string };

type StudyChatProps = {
  headerText: string;
  buildContext: () => string;
};

export function StudyChat({ headerText, buildContext }: StudyChatProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  return (
    <div className="rounded-xl border bg-card overflow-hidden mb-8 flex flex-col">
      <div className="p-4 border-b bg-muted/30">
        <p className="text-sm text-muted-foreground">{headerText}</p>
      </div>
      <div className="min-h-[200px] max-h-[360px] overflow-y-auto p-4 space-y-4">
        {chatMessages.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-8">
            Envие uma mensagem para começar.
          </p>
        )}
        {chatMessages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {chatLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2 text-sm text-muted-foreground">
              ...
            </div>
          </div>
        )}
      </div>
      <form
        className="p-4 border-t flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const text = chatInput.trim();
          if (!text || chatLoading) return;
          setChatInput("");
          setChatMessages((prev) => [...prev, { role: "user", content: text }]);
          setChatLoading(true);
          try {
            const context = buildContext();
            const res = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                context,
                messages: [...chatMessages, { role: "user", content: text }],
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Erro ao enviar mensagem.");
            setChatMessages((prev) => [...prev, { role: "assistant", content: data.message ?? "" }]);
          } catch (err) {
            setChatMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: err instanceof Error ? err.message : "Erro ao conversar.",
              },
            ]);
          } finally {
            setChatLoading(false);
          }
        }}
      >
        <Input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Sua pergunta..."
          className="flex-1"
          disabled={chatLoading}
        />
        <Button type="submit" disabled={chatLoading || !chatInput.trim()}>
          {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar"}
        </Button>
      </form>
    </div>
  );
}

