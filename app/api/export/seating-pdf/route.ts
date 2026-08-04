import { sql } from "@/lib/neon-http";
import { createSeatingPdf } from "@/lib/seating-pdf";

export const runtime = "nodejs";

type Guest = { name: string; status: string; table?: number };
type Snapshot = { guests?: Guest[] };

const tableNames = [
  "Baobab Millénaire", "Chêne Royal", "Jardin d’Acajou", "Forêt d’Ébène", "Arbre de Vie",
  "Canopée de Lumière", "Racines du Monde", "Banian Somptueux", "Île aux Palmiers",
  "Rônier Solitaire", "Forêt Éternelle", "Noyer Centenaire", "Jardin des Orchidées",
  "Clairière Enchantée", "Kapokier Verdoyant", "Bosquet des Murmures", "Refuge des Manguiers",
  "Séquoia Majestueux", "Forêt des Étoiles", "Verger des Amoureux", "Royaume des Fleurs",
  "Vallée des Palmiers", "Bois des Rêves", "Magnolia Impérial", "Iroko Sacré",
  "Chemin des Lianes", "Jardin des Bambous",
];

export async function GET() {
  try {
    const result = await sql<{ data: Snapshot }>("select data from app_state where id = $1", ["main"]);
    const guests = result.rows?.[0]?.data?.guests || [];
    const rows = guests
      .filter(guest => guest.table && guest.status !== "Désisté" && guest.status !== "Doublon")
      .sort((left, right) => left.name.localeCompare(right.name, "fr", { sensitivity: "base" }))
      .map(guest => ({
        guestName: guest.name,
        tableNumber: guest.table! - 1,
        tableName: tableNames[guest.table! - 1] || "",
      }));
    const pdf = createSeatingPdf(rows);
    return new Response(pdf, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="liste-alphabetique-plan-de-table.pdf"',
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Export impossible" }, { status: 503 });
  }
}
