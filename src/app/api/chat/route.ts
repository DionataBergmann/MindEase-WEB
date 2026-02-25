import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY não configurada." },
      { status: 500 }
    );
  }

  let body: { messages?: { role: "user" | "assistant" | "system"; content: string }[]; context?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body inválido. Envie JSON com 'messages' e opcionalmente 'context'." },
      { status: 400 }
    );
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const context = typeof body.context === "string" ? body.context.trim() : "";

  if (messages.length === 0 || messages[messages.length - 1]?.role !== "user") {
    return NextResponse.json(
      { error: "Envie pelo menos uma mensagem do usuário." },
      { status: 400 }
    );
  }

  const openai = new OpenAI({ apiKey });
  const systemContent = context
    ? `Tu és um assistente de estudos. O contexto do material do aluno é:\n\n${context.slice(0, 8000)}\n\nResponde de forma clara e didática, com base nesse contexto quando relevante.`
    : "Tu és um assistente de estudos. Responde de forma clara e didática.";

  const apiMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemContent },
    ...messages
      .filter((m) => m.role && m.content)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: apiMessages,
    });

    const content = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ message: content });
  } catch (err) {
    console.error("OpenAI chat error:", err);
    const message = err instanceof Error ? err.message : "Erro ao conversar com a IA.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
