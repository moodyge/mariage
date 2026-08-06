import { NextResponse } from "next/server";
import { requestIsAuthenticated } from "@/lib/server-auth";
import { loadWeddingState, saveWeddingState } from "@/lib/wedding-state";

export const runtime = "nodejs";
const MAX_STATE_BYTES = 2_000_000;

export async function GET() {
  try {
    const state = await loadWeddingState();
    if (!state) return NextResponse.json({ error: "Aucune donnée initiale" }, { status: 404 });
    return NextResponse.json(state, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Base indisponible" }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  if (!(await requestIsAuthenticated())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const text = await request.text();
  if (!text || Buffer.byteLength(text, "utf8") > MAX_STATE_BYTES) {
    return NextResponse.json({ error: "Données invalides ou trop volumineuses" }, { status: 413 });
  }
  let state: unknown;
  try { state = JSON.parse(text); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  if (!state || typeof state !== "object" || !Array.isArray((state as { guests?: unknown }).guests)) {
    return NextResponse.json({ error: "Format de sauvegarde invalide" }, { status: 400 });
  }
  try {
    await saveWeddingState(state);
    return NextResponse.json({ saved: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sauvegarde impossible" }, { status: 503 });
  }
}
