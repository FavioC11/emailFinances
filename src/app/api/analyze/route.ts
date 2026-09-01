import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { sbAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { question } = (await req.json()) as { question?: string };
  if (!question?.trim()) {
    return NextResponse.json({ error: "Falta la pregunta" }, { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Falta ANTHROPIC_API_KEY en .env.local" },
      { status: 500 }
    );
  }

  const { data: tx, error } = await sbAdmin()
    .from("transactions")
    .select("direction,amount,currency,amount_pen,occurred_at,counterparty,category")
    .order("occurred_at", { ascending: false })
    .limit(500);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system:
        "Eres un analista financiero personal. Responde en español, claro y " +
        "directo, con cifras. Cada transacción trae su propia moneda en el " +
        "campo `currency` (PEN = soles S/, USD = dólares US$): NO mezcles " +
        "monedas al sumar; reporta los totales por moneda por separado. Si un " +
        "movimiento en dólares trae `amount_pen`, ese es su equivalente en soles.",
      messages: [
        {
          role: "user",
          content: `Transacciones (JSON):\n${JSON.stringify(tx)}\n\nPregunta: ${question}`,
        },
      ],
    });
    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return NextResponse.json({ answer: text });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Error de la API de Anthropic (${err.status}): ${err.message}` },
        { status: 502 }
      );
    }
    throw err;
  }
}
