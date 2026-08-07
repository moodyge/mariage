import { loadWeddingState } from "@/lib/wedding-state";
import { createSeatingPdf } from "@/lib/seating-pdf";
import { orderCouplesTogether } from "@/lib/guest-order";

export const runtime = "nodejs";

type Guest = { id?: number; name: string; status: string; gender?: string; age?: string; table?: number; coupleId?: string };
type Snapshot = { guests?: Guest[]; tables?: Array<{ name: string }> };

const tableNames = [
  "Baobab Millénaire", "Chêne Royal", "Jardin d’Acajou", "Forêt d’Ébène", "Arbre de Vie",
  "Canopée de Lumière", "Racines du Monde", "Banian Somptueux", "Île aux Palmiers",
  "Rônier Solitaire", "Forêt Éternelle", "Noyer Centenaire", "Jardin des Orchidées",
  "Clairière Enchantée", "Kapokier Verdoyant", "Bosquet des Murmures", "Refuge des Manguiers",
  "Séquoia Majestueux", "Forêt des Étoiles", "Verger des Amoureux", "Royaume des Fleurs",
  "Vallée des Palmiers", "Bois des Rêves", "Magnolia Impérial", "Iroko Sacré",
  "Chemin des Lianes", "Jardin des Bambous",
];

function displayName(guest: Guest) {
  const female = /^\s*(madame|mademoiselle|mrs|mlle|mme)\.?\s+/i.test(guest.name);
  const male = /^\s*(monsieur|mr|m)\.?\s+/i.test(guest.name);
  const base = guest.name.replace(/^\s*(monsieur|madame|mademoiselle|mr|mrs|mlle|mme|m)\.?\s+/i, "").replace(/\s+/g, " ").trim();
  if (/^(col\.?|colonel)\s+/i.test(base)) return base;
  if (guest.gender === "Homme") return `M. ${base}`;
  if (guest.gender === "Femme") return `Mme. ${base}`;
  return male ? `M. ${base}` : female ? `Mme. ${base}` : base;
}

export async function GET() {
  try {
    const snapshot = (await loadWeddingState() || {}) as Snapshot;
    const guests = snapshot.guests || [];
    const currentTableNames = snapshot.tables?.length === tableNames.length ? snapshot.tables.map(table => table.name) : tableNames;
    const activeGuests = guests.filter(guest => guest.table && guest.status !== "Désisté" && guest.status !== "Doublon");
    const rows = orderCouplesTogether(activeGuests)
      .map(guest => ({
        guestName: displayName(guest),
        tableNumber: guest.table! - 1,
        tableName: currentTableNames[guest.table! - 1] || "",
        coupleId: guest.coupleId,
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
