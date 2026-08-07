import { loadWeddingState } from "@/lib/wedding-state";
import { createTablesPdf } from "@/lib/seating-pdf";
import { orderCouplesTogether } from "@/lib/guest-order";

export const runtime = "nodejs";

type Guest = { id?: number; name: string; status: string; gender?: string; age?: string; table?: number; coupleId?: string };
type Snapshot = { guests?: Guest[]; capacity?: number; tableCapacities?: Record<number, number>; tables?: Array<{ name: string; motto: string; capacity?: number }> };

const tables = [
  ["Baobab Millénaire", "Gardien du temps, il a vu mille saisons passer", 6], ["Chêne Royal", "Force tranquille, couronne dressée vers le ciel", 8],
  ["Jardin d’Acajou", "Bois chaud, cœur généreux, ombre précieuse", 8], ["Forêt d’Ébène", "Noir profond, silence noble et secret"],
  ["Arbre de Vie", "Ses racines nourrissent, ses branches protègent"], ["Canopée de Lumière", "Là où le soleil danse entre les feuilles"],
  ["Racines du Monde", "Enfoncées dans la terre, liées à tous"], ["Banian Somptueux", "Un arbre, une forêt, mille chemins"],
  ["Île aux Palmiers", "Berceau de vent et de chants d’oiseaux"], ["Rônier Solitaire", "Droit et fier, veilleur de savane"],
  ["Forêt Éternelle", "Les saisons changent, mais les feuilles restent"], ["Noyer Centenaire", "Sagesse en écorce, fruits en mémoire"],
  ["Jardin des Orchidées", "Délicatesse suspendue à chaque branche"], ["Clairière Enchantée", "Ici, les murmures deviennent magie"],
  ["Kapokier Verdoyant", "Géant doux, toit des nuages"], ["Bosquet des Murmures", "Écoute... le vent raconte des histoires"],
  ["Refuge des Manguiers", "Ombre sucrée, pause bienheureuse"], ["Séquoia Majestueux", "Toucher le ciel sans quitter la terre"],
  ["Forêt des Étoiles", "La nuit, ses feuilles captent la lumière"], ["Verger des Amoureux", "Lieu fertile où l’amour se récolte chaque jour"],
  ["Royaume des Fleurs", "Couleurs en fête, parfums en couronne"], ["Vallée des Palmiers", "Danse au rythme du vent tropical"],
  ["Bois des Rêves", "Ferme les yeux, laisse pousser l’imaginaire"], ["Magnolia Impérial", "Fleurs de soie, élégance éternelle"],
  ["Iroko Sacré", "Arbre des ancêtres, pilier du monde"], ["Chemin des Lianes", "Suis-les, elles mènent aux secrets"],
  ["Jardin des Bambous", "Souple et fort, il chante avec le vent"],
] as const;

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
    const activeGuests = guests.filter(guest => guest.status !== "Désisté" && guest.status !== "Doublon");
    const currentTables = snapshot.tables?.length === tables.length ? snapshot.tables : tables.map(table => ({ name:table[0], motto:table[1], capacity:table[2] }));
    const cards = currentTables.map((table, index) => {
      const internalNumber = index + 1;
      const tableGuests = orderCouplesTogether(activeGuests.filter(guest => guest.table === internalNumber), { couplesFirst: true });
      return {
        tableNumber: index,
        tableName: table.name, motto: table.motto,
        capacity: snapshot.tableCapacities?.[internalNumber] ?? table.capacity ?? snapshot.capacity ?? 8,
        guests: tableGuests.map(guest => ({ name: displayName(guest), age: guest.age || "" })),
      };
    }).filter(card => card.guests.length > 0);
    return new Response(createTablesPdf(cards), { headers: {
      "content-type": "application/pdf",
      "content-disposition": 'attachment; filename="plan-de-table-par-table.pdf"',
      "cache-control": "no-store",
    }});
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Export impossible" }, { status: 503 });
  }
}
