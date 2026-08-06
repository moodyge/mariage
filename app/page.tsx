"use client";

import { useEffect, useMemo, useState } from "react";

type Guest = { id: number; name: string; status: string; age: string; group: string; gender: string; language: string; tags: string[]; table?: number; lockedTable?: number; overrideTable?: number; pairId?: string; pairType?: string; partner?: string; coupleId?: string; couplePartner?: string };
const ageOrder = ["Jeune adulte", "Adulte", "Senior", "Senior++"];
function ageDistance(left: string, right: string) {
  const leftIndex = ageOrder.indexOf(left);
  const rightIndex = ageOrder.indexOf(right);
  return leftIndex < 0 || rightIndex < 0 ? undefined : Math.abs(leftIndex - rightIndex);
}
function ageProximity(left: string, right: string) {
  const distance = ageDistance(left, right);
  return distance === undefined ? 50 : [100, 68, 32, 0][Math.min(distance, 3)];
}
type SeparationRule = { id: string; aId: number; bId: number };
type IterationSnapshot = { placements: Record<number,{ table?:number; overrideTable?:number }>; roomAssignments: Record<number,number>; roomPositions: Array<{slot:number;x:number;y:number}> };
type TableDefinition = { name: string; motto: string; capacity?: number };
type AppSnapshot = {
  guests: Guest[];
  tables?: TableDefinition[];
  capacity: number;
  tableCapacities: Record<number, number>;
  separationRules: SeparationRule[];
  priorities: Record<string, number>;
  roomAssignments: Record<number, number>;
  roomPositions: Array<{slot:number;x:number;y:number}>;
  iterations: Partial<Record<1|2,IterationSnapshot>>;
  activeIteration: 1|2;
};

const defaultTableNames: TableDefinition[] = [
  { name: "Baobab Millénaire", motto: "Gardien du temps, il a vu mille saisons passer", capacity: 6 },
  { name: "Chêne Royal", motto: "Force tranquille, couronne dressée vers le ciel", capacity: 8 },
  { name: "Jardin d’Acajou", motto: "Bois chaud, cœur généreux, ombre précieuse", capacity: 8 },
  { name: "Forêt d’Ébène", motto: "Noir profond, silence noble et secret" },
  { name: "Arbre de Vie", motto: "Ses racines nourrissent, ses branches protègent" },
  { name: "Canopée de Lumière", motto: "Là où le soleil danse entre les feuilles" },
  { name: "Racines du Monde", motto: "Enfoncées dans la terre, liées à tous" },
  { name: "Banian Somptueux", motto: "Un arbre, une forêt, mille chemins" },
  { name: "Île aux Palmiers", motto: "Berceau de vent et de chants d’oiseaux" },
  { name: "Rônier Solitaire", motto: "Droit et fier, veilleur de savane" },
  { name: "Forêt Éternelle", motto: "Les saisons changent, mais les feuilles restent" },
  { name: "Noyer Centenaire", motto: "Sagesse en écorce, fruits en mémoire" },
  { name: "Jardin des Orchidées", motto: "Délicatesse suspendue à chaque branche" },
  { name: "Clairière Enchantée", motto: "Ici, les murmures deviennent magie" },
  { name: "Kapokier Verdoyant", motto: "Géant doux, toit des nuages" },
  { name: "Bosquet des Murmures", motto: "Écoute... le vent raconte des histoires" },
  { name: "Refuge des Manguiers", motto: "Ombre sucrée, pause bienheureuse" },
  { name: "Séquoia Majestueux", motto: "Toucher le ciel sans quitter la terre" },
  { name: "Forêt des Étoiles", motto: "La nuit, ses feuilles captent la lumière" },
  { name: "Verger des Amoureux", motto: "Lieu fertile où l’amour se récolte chaque jour" },
  { name: "Royaume des Fleurs", motto: "Couleurs en fête, parfums en couronne" },
  { name: "Vallée des Palmiers", motto: "Danse au rythme du vent tropical" },
  { name: "Bois des Rêves", motto: "Ferme les yeux, laisse pousser l’imaginaire" },
  { name: "Magnolia Impérial", motto: "Fleurs de soie, élégance éternelle" },
  { name: "Iroko Sacré", motto: "Arbre des ancêtres, pilier du monde" },
  { name: "Chemin des Lianes", motto: "Suis-les, elles mènent aux secrets" },
  { name: "Jardin des Bambous", motto: "Souple et fort, il chante avec le vent" },
];
const defaultRoomPositions = [
  { slot:0,x:50,y:6 }, { slot:1,x:15,y:15 }, { slot:2,x:68,y:17 }, { slot:3,x:36,y:17 }, { slot:4,x:86,y:17 },
  { slot:5,x:14,y:28 }, { slot:6,x:63,y:30 }, { slot:7,x:34,y:32 }, { slot:8,x:80,y:30 }, { slot:9,x:34,y:43 },
  { slot:10,x:70,y:38 }, { slot:11,x:18,y:56 }, { slot:12,x:61,y:46 }, { slot:13,x:39,y:55 }, { slot:14,x:78,y:46 },
  { slot:15,x:16,y:69 }, { slot:16,x:68,y:53 }, { slot:17,x:62,y:59 }, { slot:18,x:40,y:67 }, { slot:19,x:77,y:58 },
  { slot:20,x:12,y:81 }, { slot:21,x:66,y:73 }, { slot:22,x:30,y:80 }, { slot:23,x:80,y:72 }, { slot:24,x:44,y:80 },
  { slot:25,x:67,y:88 }, { slot:26,x:34,y:89 },
];

function normalizedName(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/^(m\.?|mme|mlle)\s+/, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function cleanGuestName(name: string) {
  return name
    .replace(/^\s*(monsieur|madame|mademoiselle|mr|mrs|mlle|mme|m)\.?\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function displayGuestName(guest: Pick<Guest,"name"|"gender">) {
  const base = cleanGuestName(guest.name);
  if (guest.gender === "Homme") return `M. ${base}`;
  if (guest.gender === "Femme") return `Mme. ${base}`;
  return base;
}

function normalizeGuest(guest: Guest): Guest {
  return { ...guest, name:cleanGuestName(guest.name), partner:guest.partner ? cleanGuestName(guest.partner) : undefined, couplePartner:guest.couplePartner ? cleanGuestName(guest.couplePartner) : undefined };
}

function applyFixedTables(items: Guest[]) {
  return items.map(guest => {
    if (guest.status === "Désisté" || guest.status === "Doublon") return { ...guest, table:undefined, lockedTable:undefined, overrideTable:undefined };
    return guest.lockedTable ? { ...guest, table:guest.lockedTable } : guest;
  });
}

function getTogetherComponents(items: Guest[]) {
  const byId = new Map(items.map(guest => [guest.id, guest]));
  const byName = new Map(items.map(guest => [normalizedName(guest.name), guest]));
  const edges = new Map(items.map(guest => [guest.id, new Set<number>()]));
  const connect = (left: number, right: number) => { if (left === right || !byId.has(left) || !byId.has(right)) return; edges.get(left)!.add(right); edges.get(right)!.add(left); };
  const pairGroups = new Map<string, Guest[]>();
  for (const guest of items.filter(item => item.pairId)) pairGroups.set(guest.pairId!, [...(pairGroups.get(guest.pairId!) || []), guest]);
  for (const group of pairGroups.values()) for (let index = 1; index < group.length; index++) connect(group[0].id, group[index].id);
  const coupleGroups = new Map<string, Guest[]>();
  for (const guest of items.filter(item => item.coupleId)) coupleGroups.set(guest.coupleId!, [...(coupleGroups.get(guest.coupleId!) || []), guest]);
  for (const group of coupleGroups.values()) for (let index = 1; index < group.length; index++) connect(group[0].id, group[index].id);
  for (const guest of items) for (const partnerName of (guest.partner || "").split(",").map(name => name.trim()).filter(Boolean)) {
    const partner = byName.get(normalizedName(partnerName)); if (partner) connect(guest.id, partner.id);
  }
  const visited = new Set<number>(); const components: Guest[][] = [];
  for (const guest of items) {
    if (visited.has(guest.id) || edges.get(guest.id)!.size === 0) continue;
    const stack = [guest.id]; const component: Guest[] = []; visited.add(guest.id);
    while (stack.length) { const id = stack.pop()!; component.push(byId.get(id)!); for (const next of edges.get(id)!) if (!visited.has(next)) { visited.add(next); stack.push(next); } }
    if (component.length > 1) components.push(component);
  }
  return components;
}

function getCoupleGroups(items: Guest[]) {
  const groups = new Map<string, Guest[]>();
  for (const guest of items.filter(item => item.coupleId)) groups.set(guest.coupleId!, [...(groups.get(guest.coupleId!) || []), guest]);
  return Array.from(groups.values()).filter(group => group.length > 1);
}

function getPlacementGroups(items: Guest[]) {
  return getTogetherComponents(items.map(guest => guest.pairType === "Couple" ? { ...guest, pairId:undefined, pairType:undefined, partner:undefined, coupleId:undefined, couplePartner:undefined } : { ...guest, coupleId:undefined, couplePartner:undefined }));
}

export default function Home() {
  const [accessReady, setAccessReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessPassword, setAccessPassword] = useState("");
  const [accessError, setAccessError] = useState("");
  const [tab, setTab] = useState("Plan de table");
  const [showLogin, setShowLogin] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [capacity, setCapacity] = useState(8);
  const [tableNames, setTableNames] = useState<TableDefinition[]>(() => defaultTableNames.map(table => ({ ...table })));
  const [tableCapacities, setTableCapacities] = useState<Record<number, number>>({});
  const [tableSwapFrom, setTableSwapFrom] = useState(1);
  const [tableSwapTo, setTableSwapTo] = useState(20);
  const [query, setQuery] = useState("");
  const [publicGuestQuery, setPublicGuestQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ageFilter, setAgeFilter] = useState("");
  const [generated, setGenerated] = useState(false);
  const [toast, setToast] = useState("");
  const [rowMenu, setRowMenu] = useState<number | null>(null);
  const [editing, setEditing] = useState<{ id: number; field: keyof Guest } | null>(null);
  const [relationQuery, setRelationQuery] = useState("");
  const [separationRules, setSeparationRules] = useState<SeparationRule[]>([]);
  const [ruleType, setRuleType] = useState<"together" | "separate">("separate");
  const [ruleA, setRuleA] = useState("");
  const [ruleB, setRuleB] = useState("");
  const [editingPlacementGroup, setEditingPlacementGroup] = useState<{ pairIds: string[]; memberIds: number[] } | null>(null);
  const [placementMemberQuery, setPlacementMemberQuery] = useState("");
  const [placementIssues, setPlacementIssues] = useState<Record<number, string>>({});
  const [editingTable, setEditingTable] = useState<number | null>(null);
  const [tableGuestQuery, setTableGuestQuery] = useState("");
  const [roomPositions, setRoomPositions] = useState(defaultRoomPositions);
  const [draggedRoomSlot, setDraggedRoomSlot] = useState<number | null>(null);
  const [roomAssignments, setRoomAssignments] = useState<Record<number,number>>(() => Object.fromEntries(defaultRoomPositions.map(position => [position.slot, position.slot + 1])));
  const [activeIteration, setActiveIteration] = useState<1|2>(1);
  const [iterations, setIterations] = useState<Partial<Record<1|2,IterationSnapshot>>>({});
  const [priorities, setPriorities] = useState<Record<string, number>>({ "Mixité des affiliations":85, "Mixité de genre":72, "Caractéristiques":64, "Tranches d'âge":58, "Langues communes":50 });
  const [ready, setReady] = useState(false);
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editingGuestId, setEditingGuestId] = useState<number | null>(null);
  const [newGuest, setNewGuest] = useState({ name:"", status:"En attente", age:"À définir", group:"À définir", gender:"", languages:["Français"] as string[], tags:[] as string[] });
  const filtered = useMemo(() => guests.filter(g => `${g.name} ${g.group}`.toLowerCase().includes(query.toLowerCase()) && (!groupFilter || g.group === groupFilter) && (!statusFilter || g.status === statusFilter) && (!ageFilter || g.age === ageFilter)), [guests, query, groupFilter, statusFilter, ageFilter]);
  const publicGuestResults = useMemo(() => {
    const needle = normalizedName(publicGuestQuery);
    return guests
      .filter(guest => guest.table && guest.status !== "Désisté" && guest.status !== "Doublon" && (!needle || normalizedName(guest.name).includes(needle)))
      .sort((left, right) => left.name.localeCompare(right.name, "fr", { sensitivity:"base" }));
  }, [guests, publicGuestQuery]);
  const activeFilterCount = [groupFilter, statusFilter, ageFilter].filter(Boolean).length;
  const unplacedGuests = guests.filter(guest => guest.status !== "Désisté" && guest.status !== "Doublon" && !guest.table);
  const getTableCapacity = (tableNumber: number) => tableCapacities[tableNumber] ?? tableNames[tableNumber - 1]?.capacity ?? capacity;
  const displayTableNumber = (internalTableNumber: number) => internalTableNumber - 1;

  useEffect(() => {
    fetch("/api/auth", { cache:"no-store" })
      .then(response => response.ok ? response.json() : { authenticated:false })
      .then(result => {
        const authenticated = Boolean(result.authenticated);
        setIsAuthenticated(authenticated);
        if (!authenticated) setTab("Liste alphabétique");
      })
      .finally(() => setAccessReady(true));
  }, []);

  useEffect(() => {
    if (!guestModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setGuestModalOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    document.body.classList.add("modal-open");
    return () => { window.removeEventListener("keydown", onKeyDown); document.body.classList.remove("modal-open"); };
  }, [guestModalOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileMenuOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    document.body.classList.add("mobile-menu-open");
    return () => { window.removeEventListener("keydown", onKeyDown); document.body.classList.remove("mobile-menu-open"); };
  }, [mobileMenuOpen]);
  const mergeSuggestions = useMemo(() => {
    const active = guests.filter(guest => guest.status !== "Désisté" && guest.status !== "Doublon" && guest.table);
    const capacityFor = (tableNumber: number) => tableCapacities[tableNumber] ?? tableNames[tableNumber - 1]?.capacity ?? capacity;
    const atTable = (tableNumber: number) => active.filter(guest => guest.table === tableNumber);
    const languages = (guest: Guest) => guest.language.split(" · ").filter(value => value && value !== "À définir");
    const suggestions: { source: number; target: number; sourceCount: number; targetCount: number; ageScore: number; languageScore: number; score: number }[] = [];
    for (let left = 2; left <= tableNames.length; left++) {
      const leftGuests = atTable(left);
      if (!leftGuests.length) continue;
      for (let right = left + 1; right <= tableNames.length; right++) {
        const rightGuests = atTable(right);
        if (!rightGuests.length || (leftGuests.length > capacityFor(left) / 2 && rightGuests.length > capacityFor(right) / 2)) continue;
        const crossConflict = separationRules.some(rule =>
          (leftGuests.some(guest => guest.id === rule.aId) && rightGuests.some(guest => guest.id === rule.bId)) ||
          (leftGuests.some(guest => guest.id === rule.bId) && rightGuests.some(guest => guest.id === rule.aId)));
        if (crossConflict) continue;
        const directions = [
          { source:left, target:right, sourceGuests:leftGuests, targetGuests:rightGuests },
          { source:right, target:left, sourceGuests:rightGuests, targetGuests:leftGuests },
        ].filter(option =>
          !option.sourceGuests.some(guest => guest.lockedTable) &&
          option.sourceGuests.length + option.targetGuests.length <= capacityFor(option.target));
        if (!directions.length) continue;
        const bestDirection = directions.sort((a,b) => b.targetGuests.length - a.targetGuests.length || a.target - b.target)[0];
        const pairs = leftGuests.flatMap(a => rightGuests.map(b => [a,b] as const));
        const knownAgePairs = pairs.filter(([a,b]) => ageDistance(a.age,b.age) !== undefined);
        const ageScore = knownAgePairs.length ? Math.round(knownAgePairs.reduce((total,[a,b]) => total + ageProximity(a.age,b.age), 0) / knownAgePairs.length) : 50;
        const languageScore = pairs.length ? Math.round(100 * pairs.filter(([a,b]) => languages(a).some(language => languages(b).includes(language))).length / pairs.length) : 0;
        const score = Math.round(ageScore * .65 + languageScore * .35);
        if (score < 55) continue;
        suggestions.push({ source:bestDirection.source, target:bestDirection.target, sourceCount:bestDirection.sourceGuests.length, targetCount:bestDirection.targetGuests.length, ageScore, languageScore, score });
      }
    }
    return suggestions.sort((a,b) => b.score - a.score || (a.sourceCount + a.targetCount) - (b.sourceCount + b.targetCount)).slice(0, 8);
  }, [guests, separationRules, tableCapacities, capacity]);

  useEffect(() => {
    if (!accessReady) return;
    fetch("/api/state", { cache:"no-store" })
      .then(async response => {
        if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || "Impossible de charger les données");
        return response.json() as Promise<AppSnapshot>;
      })
      .then(snapshot => {
        setGuests((snapshot.guests || []).map(normalizeGuest));
        setTableNames(snapshot.tables?.length === defaultTableNames.length ? snapshot.tables : defaultTableNames.map(table => ({ ...table })));
        setCapacity(snapshot.capacity || 8);
        setTableCapacities(snapshot.tableCapacities || {});
        setSeparationRules(snapshot.separationRules || []);
        setPriorities(snapshot.priorities || {});
        setRoomAssignments(snapshot.roomAssignments || Object.fromEntries(defaultRoomPositions.map(position => [position.slot, position.slot + 1])));
        setRoomPositions(snapshot.roomPositions?.length === defaultRoomPositions.length ? snapshot.roomPositions : defaultRoomPositions);
        setIterations(snapshot.iterations || {});
        setActiveIteration(snapshot.activeIteration === 2 ? 2 : 1);
        setReady(true);
      })
      .catch(error => notify(error instanceof Error ? error.message : "Impossible de charger les données"));
  }, [accessReady]);
  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    const snapshot: AppSnapshot = { guests, tables:tableNames, capacity, tableCapacities, separationRules, priorities, roomAssignments, roomPositions, iterations, activeIteration };
    const timeout = window.setTimeout(() => {
      fetch("/api/state", {
        method:"PUT",
        headers:{ "content-type":"application/json" },
        body:JSON.stringify(snapshot),
      }).then(response => {
        if (!response.ok) notify("La sauvegarde en ligne a échoué");
      }).catch(() => notify("La sauvegarde en ligne a échoué"));
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [guests, tableNames, capacity, tableCapacities, separationRules, priorities, roomAssignments, roomPositions, iterations, activeIteration, ready, isAuthenticated]);
  useEffect(() => {
    if (!guests.some(guest => (guest.status === "Désisté" || guest.status === "Doublon") && (guest.table || guest.lockedTable || guest.overrideTable))) return;
    setGuests(items => items.map(guest => guest.status === "Désisté" || guest.status === "Doublon" ? { ...guest, table:undefined, lockedTable:undefined, overrideTable:undefined } : guest));
  }, [guests]);

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2600); }
  function captureIteration(): IterationSnapshot {
    return {
      placements:Object.fromEntries(guests.map(guest => [guest.id,{ table:guest.table, overrideTable:guest.overrideTable }])),
      roomAssignments:{ ...roomAssignments },
      roomPositions:roomPositions.map(position => ({ ...position })),
    };
  }
  function applyIteration(snapshot: IterationSnapshot) {
    setGuests(items => applyFixedTables(items.map(guest => {
      if (guest.lockedTable) return guest;
      const placement=snapshot.placements[guest.id];
      return { ...guest, table:placement?.table, overrideTable:placement?.overrideTable };
    })));
    setRoomAssignments({ ...snapshot.roomAssignments });
    setRoomPositions(snapshot.roomPositions.map(position => ({ ...position })));
    setPlacementIssues({}); setEditingTable(null);
  }
  function createSecondIteration() {
    const snapshot=captureIteration();
    setIterations({ 1:snapshot, 2:{ placements:{...snapshot.placements}, roomAssignments:{...snapshot.roomAssignments}, roomPositions:snapshot.roomPositions.map(position=>({...position})) } });
    setActiveIteration(2);
    notify("Itération 2 créée depuis le plan actuel");
  }
  function switchIteration(target: 1|2) {
    if (target===activeIteration) return;
    const targetSnapshot=iterations[target];
    if (!targetSnapshot) return;
    setIterations(current => ({ ...current, [activeIteration]:captureIteration() }));
    applyIteration(targetSnapshot); setActiveIteration(target);
    notify(`Itération ${target} ouverte`);
  }
  function assignTableToRoomSlot(slot: number, internalTable: number) {
    if (slot === 0 || internalTable === 1) return;
    setRoomAssignments(current => {
      const previousTable = current[slot];
      const previousSlot = Number(Object.keys(current).find(key => current[Number(key)] === internalTable));
      const next = { ...current, [slot]:internalTable };
      if (Number.isFinite(previousSlot)) next[previousSlot] = previousTable;
      return next;
    });
    notify(`Emplacement ${slot} réattribué à ${tableNames[internalTable-1].name}`);
  }
  function moveRoomPosition(slot: number, clientX: number, clientY: number, bounds: DOMRect) {
    const x = Math.max(5, Math.min(95, ((clientX - bounds.left) / bounds.width) * 100));
    const y = Math.max(4, Math.min(96, ((clientY - bounds.top) / bounds.height) * 100));
    setRoomPositions(positions => positions.map(position => position.slot === slot ? { ...position, x, y } : position));
    notify(`Emplacement ${slot} déplacé`);
  }
  function generate() {
    const preparedGuests = applyFixedTables(guests);
    const eligible = preparedGuests.filter(guest => guest.status !== "Désisté" && guest.status !== "Doublon");
    const assignments = new Map<number, number>(eligible.filter(guest => guest.lockedTable || guest.overrideTable).map(guest => [guest.id, (guest.lockedTable ?? guest.overrideTable)!]));
    const tableGuests = new Map<number, Guest[]>();
    for (const guest of eligible.filter(item => item.lockedTable || item.overrideTable)) { const table=(guest.lockedTable ?? guest.overrideTable)!; tableGuests.set(table, [...(tableGuests.get(table) || []), guest]); }
    const allConnectedComponents = getTogetherComponents(eligible);
    const anchoredIds = new Set<number>();
    for (const component of allConnectedComponents) {
      const lockedTables = Array.from(new Set(component.map(guest => guest.lockedTable ?? guest.overrideTable).filter((table): table is number => Boolean(table))));
      if (lockedTables.length !== 1) continue;
      const targetTable = lockedTables[0];
      const followers = component.filter(guest => !guest.lockedTable && !guest.overrideTable);
      const hasInternalSeparation = separationRules.some(rule => component.some(guest => guest.id === rule.aId) && component.some(guest => guest.id === rule.bId));
      const seatedIds = new Set((tableGuests.get(targetTable) || []).map(guest => guest.id));
      const followerIds = new Set(followers.map(guest => guest.id));
      const hasTableSeparation = separationRules.some(rule => (followerIds.has(rule.aId) && seatedIds.has(rule.bId)) || (followerIds.has(rule.bId) && seatedIds.has(rule.aId)));
      const tableCapacity = getTableCapacity(targetTable);
      if (targetTable === 1 || hasInternalSeparation || hasTableSeparation || (tableGuests.get(targetTable)?.length || 0) + followers.length > tableCapacity) continue;
      for (const guest of followers) { assignments.set(guest.id, targetTable); anchoredIds.add(guest.id); }
      tableGuests.set(targetTable, [...(tableGuests.get(targetTable) || []), ...followers]);
    }
    const languages = (guest: Guest) => guest.language.split(" · ").filter(value => value && value !== "À définir");
    const isEnglishOnly = (guest: Guest) => languages(guest).length === 1 && languages(guest)[0] === "Anglais";
    const isFrenchEnglish = (guest: Guest) => languages(guest).includes("Français") && languages(guest).includes("Anglais");
    const unlockedGuests = eligible.filter(guest => !guest.lockedTable && !guest.overrideTable && !anchoredIds.has(guest.id));
    const connectedComponents = getTogetherComponents(unlockedGuests);
    const connectedIds = new Set(connectedComponents.flat().map(guest => guest.id));
    const conflictedComponents = connectedComponents.filter(component => separationRules.some(rule => component.some(guest => guest.id === rule.aId) && component.some(guest => guest.id === rule.bId)));
    const conflictedIds = new Set(conflictedComponents.flat().map(guest => guest.id));
    const baseUnits = [...connectedComponents.filter(component => !conflictedComponents.includes(component)), ...unlockedGuests.filter(guest => !connectedIds.has(guest.id) || conflictedIds.has(guest.id)).map(guest => [guest])];
    const usedUnits = new Set<number>();
    const supportedUnits: Guest[][] = [];
    const unitsConflict = (left: Guest[], right: Guest[]) => separationRules.some(rule => left.some(guest => guest.id === rule.aId || guest.id === rule.bId) && right.some(guest => guest.id === rule.aId || guest.id === rule.bId));
    for (let index = 0; index < baseUnits.length; index++) {
      if (usedUnits.has(index) || !baseUnits[index].some(isEnglishOnly)) continue;
      const englishAges = Array.from(new Set(baseUnits[index].filter(isEnglishOnly).map(guest => guest.age).filter(age => age !== "À définir")));
      const bridgeIndex = baseUnits.findIndex((candidate, candidateIndex) => candidateIndex !== index && !usedUnits.has(candidateIndex) && candidate.some(isFrenchEnglish) && !candidate.some(isEnglishOnly) && !unitsConflict(baseUnits[index], candidate) && (englishAges.length === 0 || candidate.some(guest => isFrenchEnglish(guest) && englishAges.some(age => (ageDistance(age,guest.age) ?? 99) <= 1))));
      if (bridgeIndex >= 0) { supportedUnits.push([...baseUnits[index], ...baseUnits[bridgeIndex]]); usedUnits.add(index); usedUnits.add(bridgeIndex); }
    }
    const supportedEnglishIds = new Set(supportedUnits.flat().filter(isEnglishOnly).map(guest => guest.id));
    const unsupportedEnglish = eligible.filter(guest => isEnglishOnly(guest) && !guest.lockedTable && !guest.overrideTable && !supportedEnglishIds.has(guest.id)).length;
    const units = [...supportedUnits, ...baseUnits.filter((_,index)=>!usedUnits.has(index))].sort((a,b) => b.length-a.length || b.reduce((n,g)=>n+separationRules.filter(r=>r.aId===g.id||r.bId===g.id).length,0)-a.reduce((n,g)=>n+separationRules.filter(r=>r.aId===g.id||r.bId===g.id).length,0) || a[0].name.localeCompare(b[0].name));
    const validGroup = (group: string) => group && group !== "À définir" && group !== "À vérifier";
    const weight = (name: string) => (priorities[name] ?? 0) / 100;
    const compatibility = (guest: Guest, seated: Guest[]) => seated.length === 0 ? 0 : seated.reduce((score, other) => {
      const affiliation = validGroup(guest.group) && validGroup(other.group) && guest.group !== other.group ? weight("Mixité des affiliations") : 0;
      const gender = guest.gender !== "Non précisé" && other.gender !== "Non précisé" && guest.gender !== other.gender ? weight("Mixité de genre") : 0;
      const distance = ageDistance(guest.age, other.age);
      const age = distance === undefined ? 0 : weight("Tranches d'âge") * (3 - distance * 2.5);
      const language = languages(guest).some(value => languages(other).includes(value)) ? weight("Langues communes") : 0;
      const characteristic = guest.tags.some(value => other.tags.includes(value)) ? weight("Caractéristiques") : 0;
      return score + affiliation + gender + age + language + characteristic;
    }, 0) / seated.length;
    const conflicts = (unit: Guest[], tableNumber: number) => unit.some(guest => separationRules.some(rule => {
      const otherId = rule.aId === guest.id ? rule.bId : rule.bId === guest.id ? rule.aId : undefined;
      return otherId !== undefined && assignments.get(otherId) === tableNumber;
    }));
    const availableTables = tableNames.map((_,index)=>index+1).filter(tableNumber => tableNumber !== 1);
    let unplaced = 0;
    const nextPlacementIssues: Record<number,string> = {};
    for (const unit of units) {
      const capacityCandidates = availableTables.filter(tableNumber => (tableGuests.get(tableNumber)?.length || 0) + unit.length <= getTableCapacity(tableNumber));
      const rawCandidates = capacityCandidates.filter(tableNumber => !conflicts(unit, tableNumber));
      const ageCompatiblePool = rawCandidates;
      const openCandidates = ageCompatiblePool.filter(tableNumber => (tableGuests.get(tableNumber)?.length || 0) > 0);
      const firstEmptyTable = ageCompatiblePool.filter(tableNumber => (tableGuests.get(tableNumber)?.length || 0) === 0).sort((a,b)=>a-b)[0];
      const candidates = openCandidates.length > 0 ? openCandidates : firstEmptyTable ? [firstEmptyTable] : [];
      if (candidates.length === 0) {
        const largestCapacity = Math.max(...availableTables.map(getTableCapacity));
        const reason = capacityCandidates.length === 0
          ? unit.length > largestCapacity ? `Groupe indivisible de ${unit.length} personnes : aucune table assez grande` : `Aucune table ne possède encore ${unit.length} place(s) libre(s)`
          : `Toutes les tables ayant assez de place sont bloquées par une séparation`;
        unit.forEach(guest=>nextPlacementIssues[guest.id]=reason); unplaced += unit.length; continue;
      }
      const bestTable = candidates.map(tableNumber => {
        const seated = tableGuests.get(tableNumber) || [];
        const affinity = unit.reduce((score,guest)=>score+compatibility(guest,seated),0) / unit.length;
        const fill = (seated.length + unit.length) / getTableCapacity(tableNumber);
        return { tableNumber, score: affinity * 100 + fill * 18 };
      }).sort((a,b)=>b.score-a.score || a.tableNumber-b.tableNumber)[0].tableNumber;
      unit.forEach(guest => assignments.set(guest.id, bestTable));
      tableGuests.set(bestTable, [...(tableGuests.get(bestTable) || []), ...unit]);
    }
    const togetherViolations = allConnectedComponents.filter(component => !separationRules.some(rule => component.some(guest=>guest.id===rule.aId) && component.some(guest=>guest.id===rule.bId)) && new Set(component.map(guest => assignments.get(guest.id))).size > 1).length;
    const separationViolations = separationRules.filter(rule => assignments.get(rule.aId) !== undefined && assignments.get(rule.aId) === assignments.get(rule.bId)).length;
    setPlacementIssues(nextPlacementIssues);
    setGuests(gs => applyFixedTables(gs).map(g => ({ ...g, table: assignments.get(g.id) ?? g.lockedTable ?? g.overrideTable })));
    setGenerated(true); setTab("Plan de table"); notify(togetherViolations || separationViolations ? `Calcul bloqué : ${togetherViolations} rapprochement(s) et ${separationViolations} exclusion(s) en conflit` : unplaced ? `${unplaced} invité(s) non placé(s) : contraintes ou capacité incompatibles` : unsupportedEnglish ? `${assignments.size} placés · ${unsupportedEnglish} anglophone(s) sans bilingue du même âge disponible` : `${assignments.size} invités placés · âges, langues et contraintes validés`);
  }
  function directPlacementUnit(guestId: number) {
    const active = guests.filter(guest=>guest.status!=="Désisté"&&guest.status!=="Doublon");
    return getTogetherComponents(active).find(component=>component.some(guest=>guest.id===guestId)) || active.filter(guest=>guest.id===guestId);
  }
  function tableCandidateFit(guest: Guest, tableNumber: number) {
    const unit = directPlacementUnit(guest.id);
    const unitIds = new Set(unit.map(member => member.id));
    const seated = guests.filter(member => member.table === tableNumber && !unitIds.has(member.id) && member.status !== "Désisté" && member.status !== "Doublon");
    if (!seated.length) return { score:50, reasons:["Table encore vide"], compatible:unit.length <= getTableCapacity(tableNumber) };
    const languageList = (member: Guest) => member.language.split(" · ").filter(value => value && value !== "À définir");
    const candidateLanguages = Array.from(new Set(unit.flatMap(languageList)));
    const tableLanguages = Array.from(new Set(seated.flatMap(languageList)));
    const sharedLanguages = candidateLanguages.filter(language => tableLanguages.includes(language));
    const candidateAges = Array.from(new Set(unit.map(member => member.age).filter(age => age !== "À définir")));
    const tableAges = Array.from(new Set(seated.map(member => member.age).filter(age => age !== "À définir")));
    const agePairs = candidateAges.flatMap(candidateAge => tableAges.map(tableAge => ({ candidateAge, tableAge, distance:ageDistance(candidateAge, tableAge) })));
    const knownAgePairs = agePairs.filter(pair => pair.distance !== undefined);
    const closestAgePair = [...knownAgePairs].sort((a,b) => (a.distance ?? 99) - (b.distance ?? 99))[0];
    const knownGroups = new Set(seated.map(member => member.group).filter(group => group !== "À définir" && group !== "À vérifier"));
    const unitGroups = Array.from(new Set(unit.map(member => member.group).filter(group => group !== "À définir" && group !== "À vérifier")));
    const newAffiliation = unitGroups.some(group => !knownGroups.has(group));
    const ageScore = knownAgePairs.length ? Math.round(knownAgePairs.reduce((total,pair) => total + ageProximity(pair.candidateAge,pair.tableAge), 0) / knownAgePairs.length) : 50;
    const languageScore = candidateLanguages.length && tableLanguages.length ? (sharedLanguages.length ? 100 : 0) : 50;
    const affiliationScore = unitGroups.length ? (newAffiliation ? 100 : 55) : 50;
    const seatedIds = new Set(seated.map(member => member.id));
    const separated = separationRules.some(rule => (unitIds.has(rule.aId) && seatedIds.has(rule.bId)) || (unitIds.has(rule.bId) && seatedIds.has(rule.aId)) || (unitIds.has(rule.aId) && unitIds.has(rule.bId)));
    const hasCapacity = seated.length + unit.filter(member => !member.lockedTable).length <= getTableCapacity(tableNumber);
    const reasons = [
      !closestAgePair ? "Âge non renseigné" : closestAgePair.distance === 0 ? `Même âge : ${closestAgePair.candidateAge}` : closestAgePair.distance === 1 ? `Tranche voisine : ${closestAgePair.candidateAge} / ${closestAgePair.tableAge}` : closestAgePair.distance === 2 ? `Écart d’âge marqué : ${closestAgePair.candidateAge} / ${closestAgePair.tableAge}` : `Écart d’âge fort : ${closestAgePair.candidateAge} / ${closestAgePair.tableAge}`,
      sharedLanguages.length ? `Langue commune : ${sharedLanguages.join(", ")}` : "Aucune langue commune",
      newAffiliation ? "Nouvelle affiliation" : "Affiliation déjà présente",
    ];
    return { score:Math.round(ageScore * .5 + languageScore * .35 + affiliationScore * .15), reasons, compatible:!separated && hasCapacity };
  }
  function placeDirectly(guestId: number, tableNumber: number) {
    const unit = directPlacementUnit(guestId);
    if (!unit.length) return;
    const lockedElsewhere = unit.find(guest=>guest.lockedTable && guest.lockedTable!==tableNumber);
    if (lockedElsewhere) { notify(`${lockedElsewhere.name} possède un placement imposé sur une autre table`); return; }
    const movable = unit.filter(guest=>!guest.lockedTable);
    const movingIds = new Set(movable.map(guest=>guest.id));
    const seated = guests.filter(guest=>guest.table===tableNumber&&!movingIds.has(guest.id)&&guest.status!=="Désisté"&&guest.status!=="Doublon");
    if (seated.length + movable.length > getTableCapacity(tableNumber)) { notify(`Il manque ${seated.length+movable.length-getTableCapacity(tableNumber)} place(s) sur cette table`); return; }
    const seatedIds = new Set(seated.map(guest=>guest.id));
    const unitIds = new Set(unit.map(guest=>guest.id));
    const separation = separationRules.find(rule=>(unitIds.has(rule.aId)&&seatedIds.has(rule.bId))||(unitIds.has(rule.bId)&&seatedIds.has(rule.aId))||(unitIds.has(rule.aId)&&unitIds.has(rule.bId)));
    if (separation) { notify("Placement impossible : une règle de séparation serait violée"); return; }
    setGuests(items=>items.map(guest=>movingIds.has(guest.id)?{...guest,table:tableNumber,overrideTable:tableNumber}:guest));
    setEditingTable(null); setTableGuestQuery(""); notify(`${unit.length>1?`${unit.length} personnes déplacées`:unit[0].name} vers la table ${displayTableNumber(tableNumber)}`);
  }
  function removeDirectly(guestId: number) {
    const unit = directPlacementUnit(guestId);
    if (unit.some(guest=>guest.lockedTable)) { notify("Un placement imposé ne peut pas être retiré"); return; }
    const ids = new Set(unit.map(guest=>guest.id));
    setGuests(items=>items.map(guest=>ids.has(guest.id)?{...guest,table:undefined,overrideTable:undefined}:guest));
    notify(`${unit.length} personne(s) remise(s) dans « Reste à placer »`);
  }

  function togglePositionLock(guestId: number) {
    const guest = guests.find(g => g.id === guestId);
    if (!guest || guest.lockedTable || !guest.table) return;
    const unit = directPlacementUnit(guestId).filter(g => !g.lockedTable);
    const ids = new Set(unit.map(g => g.id));
    const shouldLock = !guest.overrideTable;
    setGuests(items => items.map(item => ids.has(item.id)
      ? { ...item, overrideTable: shouldLock ? item.table : undefined }
      : item));
    notify(shouldLock ? `${unit.length} position(s) verrouillée(s)` : `${unit.length} position(s) déverrouillée(s)`);
  }

  function mergeTables(source: number, target: number) {
    const sourceGuests = guests.filter(guest => guest.table === source && guest.status !== "Désisté" && guest.status !== "Doublon");
    const targetGuests = guests.filter(guest => guest.table === target && guest.status !== "Désisté" && guest.status !== "Doublon");
    if (!sourceGuests.length) { notify("Cette table est déjà vide"); return; }
    if (sourceGuests.some(guest => guest.lockedTable)) { notify("Fusion impossible : la table à vider contient des placements imposés"); return; }
    if (sourceGuests.length + targetGuests.length > getTableCapacity(target)) { notify("Fusion impossible : la table cible n’a plus assez de places"); return; }
    const sourceIds = new Set(sourceGuests.map(guest => guest.id));
    const targetIds = new Set(targetGuests.map(guest => guest.id));
    const conflict = separationRules.some(rule => (sourceIds.has(rule.aId) && targetIds.has(rule.bId)) || (sourceIds.has(rule.bId) && targetIds.has(rule.aId)));
    if (conflict) { notify("Fusion impossible : une règle de séparation serait violée"); return; }
    const mergedIds = new Set([...sourceIds, ...targetIds]);
    setGuests(items => items.map(guest => mergedIds.has(guest.id) && !guest.lockedTable ? { ...guest, table:target, overrideTable:target } : guest));
    notify(`Tables fusionnées : ${sourceGuests.length + targetGuests.length} personnes verrouillées à la table ${displayTableNumber(target)}`);
  }
  function updateGuest(id: number, field: keyof Guest, value: string | string[]) {
    setGuests(gs => gs.map(g => {
      if (g.id !== id) return g;
      if (field === "status" && (value === "Désisté" || value === "Doublon")) return { ...g, status:value, table:undefined, lockedTable:undefined, overrideTable:undefined };
      if (field === "gender" && typeof value === "string") return { ...g, gender:value };
      return { ...g, [field]: value };
    }));
  }
  function editKey(id: number, field: keyof Guest) { return editing?.id === id && editing.field === field; }
  const ages = ["À définir", "Jeune adulte", "Adulte", "Senior", "Senior++"];
  const genders = ["Femme", "Homme"];
  const statuses = ["Confirmé", "En attente", "Désisté", "Doublon"];
  const languages = ["Français", "Anglais", "Flamand"];
  const groups = Array.from(new Set([...guests.map(g => g.group).filter(Boolean), "À définir", "À vérifier"])).sort((a,b) => a.localeCompare(b));
  const coupleRules = getCoupleGroups(guests);
  const placementSeeds = getPlacementGroups(guests);
  const placementSeedIds = new Set(placementSeeds.flat().map(guest => guest.id));
  const placementRules = getTogetherComponents(guests).filter(group => group.some(guest => placementSeedIds.has(guest.id)));
  function bulkGroup(group: string) {
    if (!group) return;
    setGuests(gs => gs.map(g => selected.includes(g.id) ? { ...g, group } : g));
    notify(`${selected.length} invités classés « ${group} »`);
  }
  function addRule() {
    const a = guests.find(guest => guest.name.localeCompare(ruleA, undefined, { sensitivity:"base" }) === 0);
    const b = guests.find(guest => guest.name.localeCompare(ruleB, undefined, { sensitivity:"base" }) === 0);
    if (!a || !b || a.id === b.id) { notify("Choisissez deux invités différents dans les suggestions"); return; }
    if (ruleType === "separate") {
      if (!separationRules.some(rule => [rule.aId, rule.bId].includes(a.id) && [rule.aId, rule.bId].includes(b.id))) setSeparationRules(rules => [...rules, { id:`SEP-${Date.now()}`, aId:a.id, bId:b.id }]);
    } else {
      const pairId = `MANUEL-${Math.min(a.id,b.id)}-${Math.max(a.id,b.id)}`;
      setGuests(items => {
        const joinedIds = new Set(items.filter(item => item.id === a.id || item.id === b.id || (a.pairId && item.pairId === a.pairId) || (b.pairId && item.pairId === b.pairId)).map(item => item.id));
        const joinedNames = items.filter(item => joinedIds.has(item.id)).map(item => item.name);
        return items.map(item => joinedIds.has(item.id) ? { ...item, pairId, pairType:"À placer ensemble", partner:joinedNames.filter(name=>name!==item.name).join(", ") } : item);
      });
    }
    setRuleA(""); setRuleB(""); notify("Règle ajoutée et sauvegardée");
  }
  function removeTogetherGroup(group: Guest[]) {
    const ids = new Set(group.map(guest=>guest.id));
    const coupleOnly = group.length === 2 && group.every(guest => guest.coupleId && guest.coupleId === group[0].coupleId);
    setGuests(items => items.map(item => !ids.has(item.id) ? item : coupleOnly ? { ...item, coupleId:undefined, couplePartner:undefined } : { ...item, pairId:undefined, pairType:undefined, partner:undefined }));
  }
  function beginPlacementGroupEdit(group: Guest[]) {
    const pairIds = Array.from(new Set(group.map(guest => guest.pairId).filter((id): id is string => Boolean(id))));
    const memberIds = guests.filter(guest => guest.pairId && pairIds.includes(guest.pairId)).map(guest => guest.id);
    setEditingPlacementGroup({ pairIds, memberIds });
    setPlacementMemberQuery("");
  }
  function savePlacementGroupEdit() {
    if (!editingPlacementGroup || editingPlacementGroup.memberIds.length < 2) { notify("Un groupe doit contenir au moins deux personnes"); return; }
    const selectedIds = new Set(editingPlacementGroup.memberIds);
    const oldPairIds = new Set(editingPlacementGroup.pairIds);
    const pairId = editingPlacementGroup.pairIds[0] || `MANUEL-${Date.now()}`;
    setGuests(items => {
      const updated = items.map(item => {
        if (selectedIds.has(item.id)) return { ...item, pairId, pairType:"À placer ensemble" };
        if (item.pairId && oldPairIds.has(item.pairId)) return { ...item, pairId:undefined, pairType:undefined, partner:undefined };
        return item;
      });
      const membersByPairId = new Map<string, Guest[]>();
      for (const item of updated.filter(item => item.pairId)) membersByPairId.set(item.pairId!, [...(membersByPairId.get(item.pairId!) || []), item]);
      return updated.map(item => {
        if (!item.pairId) return item;
        const members = membersByPairId.get(item.pairId) || [];
        if (members.length < 2) return { ...item, pairId:undefined, pairType:undefined, partner:undefined };
        return { ...item, partner:members.filter(member=>member.id!==item.id).map(member=>member.name).join(", ") };
      });
    });
    setEditingPlacementGroup(null); setPlacementMemberQuery(""); notify("Groupe modifié sans toucher aux couples");
  }
  function textEditor(g: Guest, field: "name") {
    const finish = () => { updateGuest(g.id, "name", cleanGuestName(g.name)); setEditing(null); };
    return editKey(g.id, field) ? <input className="inline-input" autoFocus value={g[field]} onChange={e => updateGuest(g.id, field, e.target.value)} onBlur={finish} onKeyDown={e => e.key === "Enter" && finish()} /> : <button className="inline-value" onClick={() => setEditing({ id: g.id, field })}>{g[field]}<span>✎</span></button>;
  }
  function selectEditor(g: Guest, field: "age" | "group" | "gender", options: string[]) {
    return editKey(g.id, field) ? <select className="inline-select" autoFocus value={g[field]} onChange={e => { updateGuest(g.id, field, e.target.value); setEditing(null); }} onBlur={() => setEditing(null)}>{options.map(o => <option key={o}>{o}</option>)}</select> : <button className={`inline-value ${field === "group" ? "pill" : ""}`} onClick={() => setEditing({ id: g.id, field })}>{g[field]}<span>⌄</span></button>;
  }
  function tagsEditor(g: Guest) {
    const options = ["Témoin", "Invité d’honneur", "Proche des mariés", "Discours prévu", "Mobilité réduite", "Malentendant", "Végétarien", "Allergie alimentaire", "Avec enfant", "Avec bébé/poussette", "Aide linguistique", "Connaît peu de monde", "Animateur/maître de cérémonie"];
    function toggle(tag: string) { updateGuest(g.id, "tags", g.tags.includes(tag) ? g.tags.filter(item => item !== tag) : [...g.tags, tag]); }
    return editKey(g.id, "tags") ? <div className="characteristic-editor">{options.map(tag => <label key={tag}><input type="checkbox" checked={g.tags.includes(tag)} onChange={() => toggle(tag)} />{tag}{tag === "Témoin" && <b>Essentiel</b>}</label>)}<button onClick={() => setEditing(null)}>Terminé</button></div> : <button className="tag-list" onClick={() => setEditing({ id: g.id, field: "tags" })}>{g.tags.length ? g.tags.map(t => <mark key={t}>{t}</mark>) : <i>＋ Ajouter</i>}<span>⌄</span></button>;
  }
  function languageEditor(g: Guest) {
    const options = ["Français", "Anglais", "Flamand"];
    const selectedLanguages = g.language.split(" · ").filter(language => options.includes(language));
    function toggle(language: string) {
      const next = selectedLanguages.includes(language) ? selectedLanguages.filter(item => item !== language) : [...selectedLanguages, language];
      updateGuest(g.id, "language", options.filter(item => next.includes(item)).join(" · ") || "À définir");
    }
    return editKey(g.id, "language") ? <div className="language-editor">{options.map(language => <label key={language}><input type="checkbox" checked={selectedLanguages.includes(language)} onChange={() => toggle(language)} />{language}</label>)}<button onClick={() => setEditing(null)}>Terminé</button></div> : <button className="inline-value language-value" onClick={() => setEditing({ id: g.id, field: "language" })}>{g.language}<span>⌄</span></button>;
  }
  function relationEditor(g: Guest) {
    function choose(partnerId: string) {
      if (partnerId === "__remove__") {
        setGuests(items => items.map(item => item.coupleId === g.coupleId ? { ...item, coupleId:undefined, couplePartner:undefined } : item));
        setEditing(null); notify(`Le couple de ${g.name} a été retiré sans modifier ses groupes`); return;
      }
      if (!partnerId) return;
      const targetId = Number(partnerId); const target = guests.find(item => item.id === targetId); if (!target) return;
      const coupleId = `COUPLE-${Math.min(g.id, target.id)}-${Math.max(g.id, target.id)}`;
      setGuests(items => items.map(item => {
        const cleared = item.coupleId === g.coupleId || item.coupleId === target.coupleId ? { ...item, coupleId:undefined, couplePartner:undefined } : item;
        if (item.id === g.id) return { ...cleared, coupleId, couplePartner:target.name };
        if (item.id === target.id) return { ...cleared, coupleId, couplePartner:g.name };
        return cleared;
      })); setEditing(null);
    }
    const candidates = guests.filter(item => item.id !== g.id).sort((a,b)=>a.name.localeCompare(b.name));
    function selectTypedName(value: string) {
      setRelationQuery(value);
      const target = candidates.find(item => item.name.localeCompare(value, undefined, { sensitivity: "base" }) === 0);
      if (target) choose(String(target.id));
    }
    return editKey(g.id, "pairId") ? <div className="relation-editor"><input className="inline-input relation-search" autoFocus list={`relation-options-${g.id}`} value={relationQuery} placeholder="Taper le conjoint…" onChange={e => selectTypedName(e.target.value)} onKeyDown={e => { if (e.key === "Escape") setEditing(null); }} onBlur={() => window.setTimeout(() => setEditing(null), 150)} /><datalist id={`relation-options-${g.id}`}>{candidates.map(item => <option key={item.id} value={item.name} />)}</datalist>{g.coupleId && <button onMouseDown={e => e.preventDefault()} onClick={() => choose("__remove__")}>Retirer le couple</button>}</div> : <button className="relation-badge" onClick={() => { setRelationQuery(""); setEditing({ id:g.id, field:"pairId" }); }}>{g.coupleId ? <><b>Couple</b><small>{g.couplePartner}</small></> : <>＋ Noter le couple</>}</button>;
  }
  function permanentlyDelete(g: Guest) {
    if (!window.confirm(`Supprimer définitivement ${g.name} ?`)) return;
    setGuests(items => items.filter(item => item.id !== g.id).map(item => item.pairId && item.pairId === g.pairId ? { ...item, pairId: undefined, pairType: undefined, partner: undefined } : item));
    setSelected(items => items.filter(id => id !== g.id)); setRowMenu(null); notify(`${g.name} a été supprimé définitivement`);
  }
  function statusEditor(g: Guest) {
    return editKey(g.id, "status") ? <select className="status-select" autoFocus value={g.status} onChange={e => { updateGuest(g.id, "status", e.target.value); setEditing(null); }} onBlur={() => setEditing(null)}>{statuses.map(status => <option key={status}>{status}</option>)}</select> : <button className={`status-chip status-${g.status.toLowerCase().replace("é","e").replace(" ","-")}`} onClick={() => setEditing({ id:g.id, field:"status" })}>{g.status}</button>;
  }
  async function authenticate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/auth", {
      method:"POST",
      headers:{ "content-type":"application/json" },
      body:JSON.stringify({ password:accessPassword }),
    });
    if (!response.ok) {
      setAccessError("Mot de passe incorrect");
      return;
    }
    setIsAuthenticated(true);
    setShowLogin(false);
    setTab("Invités");
    setAccessError("");
    setAccessPassword("");
  }
  function exportAlphabeticalSeating() {
    const link = document.createElement("a");
    link.href = "/api/export/seating-pdf";
    link.download = "liste-alphabetique-plan-de-table.pdf";
    link.click();
    notify("PDF alphabétique en cours de téléchargement");
  }
  function exportTablesPdf() {
    const link = document.createElement("a");
    link.href = "/api/export/tables-pdf";
    link.download = "plan-de-table-par-table.pdf";
    link.click();
    notify("PDF des tables en cours de téléchargement");
  }
  function openGuestEditor(guest?: Guest) {
    setEditingGuestId(guest?.id ?? null);
    setNewGuest(guest ? { name:guest.name, status:guest.status, age:guest.age, group:guest.group, gender:guest.gender, languages:guest.language.split(" · ").filter(Boolean), tags:[...guest.tags] } : { name:"", status:"En attente", age:"À définir", group:"À définir", gender:"", languages:["Français"], tags:[] });
    setGuestModalOpen(true);
  }
  function saveGuest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = cleanGuestName(newGuest.name);
    if (!name) return;
    if (newGuest.gender !== "Femme" && newGuest.gender !== "Homme") return notify("Choisissez le genre pour afficher M. ou Mme.");
    if (editingGuestId !== null) {
      setGuests(items => items.map(guest => guest.id === editingGuestId ? { ...guest, name, status:newGuest.status, age:newGuest.age, group:newGuest.group, gender:newGuest.gender, language:newGuest.languages.join(" · ") || "Français", tags:newGuest.tags, ...((newGuest.status === "Désisté" || newGuest.status === "Doublon") ? { table:undefined, lockedTable:undefined, overrideTable:undefined } : {}) } : guest));
    } else {
      const id = Math.max(0,...guests.map(guest=>guest.id))+1;
      setGuests(items => [...items, { id, name, status:newGuest.status, age:newGuest.age, group:newGuest.group, gender:newGuest.gender, language:newGuest.languages.join(" · ") || "Français", tags:newGuest.tags }]);
    }
    setNewGuest({ name:"", status:"En attente", age:"À définir", group:"À définir", gender:"", languages:["Français"], tags:[] });
    setGuestModalOpen(false);
    setEditingGuestId(null);
    notify(editingGuestId !== null ? `${name} a été modifié` : `${name} a été ajouté`);
  }
  function updateTableDefinition(index: number, field: "name" | "motto", value: string) {
    setTableNames(current => current.map((table, tableIndex) => tableIndex === index ? { ...table, [field]:value } : table));
  }
  function swapTableIdentities() {
    if (tableSwapFrom === tableSwapTo) return notify("Choisissez deux tables différentes");
    setTableNames(current => {
      const next = current.map(table => ({ ...table }));
      const left = next[tableSwapFrom - 1];
      const right = next[tableSwapTo - 1];
      next[tableSwapFrom - 1] = { ...left, name:right.name, motto:right.motto };
      next[tableSwapTo - 1] = { ...right, name:left.name, motto:left.motto };
      return next;
    });
    notify(`Noms et devises des tables ${displayTableNumber(tableSwapFrom)} et ${displayTableNumber(tableSwapTo)} échangés`);
  }
  const iterationControls = <><button className="outline public-export" onClick={exportTablesPdf}>↓ Tirage des tables PDF</button><div className="iteration-switcher"><button className={activeIteration===1?"active":""} onClick={()=>switchIteration(1)}>Itération 1</button>{iterations[2]?<button className={activeIteration===2?"active":""} onClick={()=>switchIteration(2)}>Itération 2</button>:<button onClick={createSecondIteration}>＋ Créer l’itération 2</button>}</div></>;

  if (!accessReady) return <main className="access-screen" aria-busy="true" />;

  return (
    <main className={!isAuthenticated ? "public-readonly" : undefined}>
      <header className="topbar">
        <div className="brand"><span className="brandmark">P</span><div><strong>Place&nbsp;Parfaite</strong><small>LE PLAN DE TABLE, EN HARMONIE</small></div></div>
        <button className="mobile-menu-trigger" aria-label="Ouvrir le menu" aria-expanded={mobileMenuOpen} onClick={()=>setMobileMenuOpen(true)}><span></span><span></span><span></span></button>
        <nav className={mobileMenuOpen?"mobile-open":""}><div className="mobile-nav-heading"><div><small>PLACE PARFAITE</small><b>Navigation</b></div><button aria-label="Fermer le menu" onClick={()=>setMobileMenuOpen(false)}>×</button></div>{(isAuthenticated ? ["Invités", "Liste alphabétique", "Plan de table", "Plan de salle", "Tables & devises", "Règles"] : ["Liste alphabétique", "Plan de table", "Plan de salle"]).map((x,index) => <button key={x} className={tab === x ? "active" : ""} onClick={() => {setTab(x);setMobileMenuOpen(false)}}><span>0{index+1}</span>{x}<i>→</i></button>)}{!isAuthenticated&&<button className="menu-auth-button" onClick={()=>{setShowLogin(true);setMobileMenuOpen(false)}}><span>⌁</span>Se connecter<i>→</i></button>}</nav>
        {mobileMenuOpen&&<button className="mobile-nav-backdrop" aria-label="Fermer le menu" onClick={()=>setMobileMenuOpen(false)}/>}
      </header>

      {isAuthenticated && tab === "Invités" && <section className="page">
        <div className="heading"><div><p className="eyebrow">VOTRE MARIAGE · 14 JUIN 2027</p><h1>La liste des invités</h1><p>Organisez les affinités aujourd'hui, laissez l'algorithme trouver l'équilibre demain.</p></div><div className="actions"><button className="primary" onClick={() => openGuestEditor()}>＋ Ajouter un invité</button></div></div>
        <div className="stats"><article><span>INVITÉS ACTIFS</span><b>{guests.filter(g=>g.status!=="Désisté"&&g.status!=="Doublon").length}</b><small>{guests.length} fiches au total</small></article><article><span>GROUPES</span><b>{new Set(guests.map(g=>g.group)).size}</b><small>affiliations identifiées</small></article><article><span>DÉSISTEMENTS</span><b>{guests.filter(g=>g.status==="Désisté").length}</b><small>exclus de la génération</small></article><article className="capacity"><span>CAPACITÉ PAR TABLE</span><div><button onClick={() => setCapacity(Math.max(2,capacity-1))}>−</button><b>{capacity}</b><button onClick={() => setCapacity(capacity+1)}>＋</button></div><small>Le plan sera recalculé à la demande</small></article></div>
        <div className="toolbar"><div className="search">⌕ <input aria-label="Rechercher" placeholder="Rechercher un invité, une famille…" value={query} onChange={e=>setQuery(e.target.value)} /></div><div className="filters"><span>☷ Filtres {activeFilterCount > 0 && <b>{activeFilterCount}</b>}</span><select aria-label="Filtrer par affiliation" value={groupFilter} onChange={e=>setGroupFilter(e.target.value)}><option value="">Toutes les affiliations</option>{groups.map(group=><option key={group}>{group}</option>)}</select><select aria-label="Filtrer par statut" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="">Tous les statuts</option>{statuses.map(status=><option key={status}>{status}</option>)}</select><select aria-label="Filtrer par tranche d’âge" value={ageFilter} onChange={e=>setAgeFilter(e.target.value)}><option value="">Tous les âges</option>{ages.map(age=><option key={age}>{age}</option>)}</select>{activeFilterCount > 0 && <button onClick={()=>{setGroupFilter("");setStatusFilter("");setAgeFilter("")}}>Effacer</button>}</div><i></i><span>{filtered.length} affichés · {selected.length} sélectionnés</span>{selected.length > 0 && <select className="bulk-select" defaultValue="" onChange={e=>{bulkGroup(e.target.value);e.target.value=""}}><option value="" disabled>Modifier l’affiliation…</option>{groups.map(group=><option key={group}>{group}</option>)}</select>}{selected.length > 0 && <select className="bulk-select" defaultValue="" onChange={e=>{const status=e.target.value;setGuests(items=>items.map(item=>selected.includes(item.id)?((status==="Désisté"||status==="Doublon")?{...item,status,table:undefined,lockedTable:undefined,overrideTable:undefined}:{...item,status}):item));notify(`${selected.length} statuts modifiés`);e.target.value=""}}><option value="" disabled>Modifier le statut…</option>{statuses.map(status=><option key={status}>{status}</option>)}</select>}<button onClick={()=>{setGuests(items=>items.map(item=>selected.includes(item.id)?{...item,status:"Désisté",table:undefined,lockedTable:undefined,overrideTable:undefined}:item));setSelected([]);notify("Invités marqués comme désistés")}}>Marquer désisté</button></div>
        <div className="edit-hint">✎ Cliquez sur n'importe quelle information pour la modifier — chaque changement est sauvegardé automatiquement.</div>
        <div className="tablewrap"><table><thead><tr><th><input type="checkbox" checked={selected.length===guests.length} onChange={e=>setSelected(e.target.checked?guests.map(g=>g.id):[])} /></th><th>INVITÉ / STATUT</th><th>TRANCHE D'ÂGE</th><th>AFFILIATION</th><th>GENRE</th><th>LANGUES</th><th>LIEN</th><th>CARACTÉRISTIQUES</th><th></th></tr></thead><tbody>{filtered.map(g=><tr className={g.status==="Désisté"||g.status==="Doublon"?"inactive-row":""} key={g.id}><td><input type="checkbox" checked={selected.includes(g.id)} onChange={()=>setSelected(s=>s.includes(g.id)?s.filter(id=>id!==g.id):[...s,g.id])}/></td><td><div className="person"><span>{g.name.split(" ").map(n=>n[0]).join("")}</span><div>{textEditor(g,"name")}{statusEditor(g)}<small className="mobile-guest-summary">{g.age} · {g.group} · {g.language}</small></div><button className="mobile-edit-guest" onClick={()=>openGuestEditor(g)}>Modifier</button></div></td><td>{selectEditor(g,"age",ages)}</td><td>{selectEditor(g,"group",groups)}</td><td>{selectEditor(g,"gender",genders)}</td><td>{languageEditor(g)}</td><td>{relationEditor(g)}</td><td>{tagsEditor(g)}</td><td className="row-actions"><button aria-label={`Actions pour ${g.name}`} onClick={()=>setRowMenu(rowMenu===g.id?null:g.id)}>•••</button>{rowMenu===g.id&&<div className="row-menu"><button onClick={()=>{updateGuest(g.id,"status","Désisté");setRowMenu(null)}}>Marquer désisté</button><button className="danger" onClick={()=>permanentlyDelete(g)}>Supprimer définitivement</button></div>}</td></tr>)}</tbody></table></div>
        <div className="bottom"><p><b>{guests.length} invités</b> · dernière modification à l'instant</p></div>
      </section>}

      {tab === "Liste alphabétique" && <section className="page public-directory-page">
        <div className="public-directory-bar"><div><p className="eyebrow">LISTE ALPHABÉTIQUE</p><h1>Trouvez votre table</h1></div><div className="public-directory-search"><span aria-hidden="true">⌕</span><input autoFocus type="search" inputMode="search" autoComplete="off" aria-label="Rechercher votre nom" placeholder="Rechercher un prénom ou un nom…" value={publicGuestQuery} onChange={event=>setPublicGuestQuery(event.target.value)}/>{publicGuestQuery&&<button aria-label="Effacer la recherche" onClick={()=>setPublicGuestQuery("")}>×</button>}</div></div>
        {publicGuestResults.length ? <div className="public-directory-list">{publicGuestResults.map(guest=>{const internalTable=guest.table!;const table=tableNames[internalTable-1];return <article key={guest.id}><span className="public-directory-initials">{guest.name.split(" ").filter(Boolean).slice(0,2).map(part=>part[0]).join("")}</span><div><h2>{displayGuestName(guest)}</h2><p>{table?.name}</p></div><strong><small>TABLE</small>{displayTableNumber(internalTable)}</strong></article>})}</div>:<div className="public-directory-empty"><b>Aucun invité trouvé</b><p>Vérifiez l’orthographe ou essayez seulement quelques lettres.</p><button onClick={()=>setPublicGuestQuery("")}>Voir toute la liste</button></div>}
      </section>}

      {tab === "Plan de table" && <section className="page"><div className="heading"><div><p className="eyebrow">PROPOSITION {generated ? "NOUVELLEMENT CALCULÉE" : "DE TRAVAIL"}</p><h1>Votre plan de table</h1><p>{isAuthenticated?"Une composition équilibrée, modifiable par override.":"Consultez la répartition des invités par table."}</p></div><div className="plan-heading-actions"><button className="outline public-export" onClick={exportAlphabeticalSeating}>↓ Liste alphabétique PDF</button>{iterationControls}<button className="primary" onClick={generate}>✦ Recalculer le plan</button></div></div><div className="placement-legend"><span className="legend-imposed">● Placement imposé</span><span className="legend-locked">● Manuel verrouillé</span><span className="legend-auto">● Auto-fill</span></div><details className="table-merger"><summary><div><small>OUTIL DE RAPPROCHEMENT</small><b>Rapprocheur de tables</b></div><strong>{mergeSuggestions.length} proposition(s)</strong></summary><p>Tables peu remplies, sans exclusion, classées selon l’âge et les langues. Une fusion remplace les verrouillages manuels.</p>{mergeSuggestions.length?<div className="merge-suggestions">{mergeSuggestions.map(suggestion=><details className="merge-proposal" key={`${suggestion.source}-${suggestion.target}`}><summary><div><b>Table {displayTableNumber(suggestion.source)} → Table {displayTableNumber(suggestion.target)}</b><small>{tableNames[suggestion.source-1].name} rejoint {tableNames[suggestion.target-1].name}</small></div><span>{suggestion.sourceCount} + {suggestion.targetCount}/{getTableCapacity(suggestion.target)}</span><div className="merge-scores"><em>Âge {suggestion.ageScore}%</em><em>Langues {suggestion.languageScore}%</em><strong>{suggestion.score}% compatible</strong></div><i>Voir les invités</i></summary><div className="merge-people"><section><h4>À déplacer · Table {displayTableNumber(suggestion.source)}</h4>{guests.filter(g=>g.table===suggestion.source&&g.status!=="Désisté"&&g.status!=="Doublon").map(g=><div key={g.id}><b>{g.name}</b><small>{g.age} · {g.language} · {g.group}</small></div>)}</section><section><h4>Déjà présents · Table {displayTableNumber(suggestion.target)}</h4>{guests.filter(g=>g.table===suggestion.target&&g.status!=="Désisté"&&g.status!=="Doublon").map(g=><div key={g.id}><b>{g.name}</b><small>{g.age} · {g.language} · {g.group}</small></div>)}</section></div><div className="merge-confirm"><small>La fusion remplacera les verrouillages manuels de ces deux tables.</small><button onClick={()=>mergeTables(suggestion.source,suggestion.target)}>Fusionner · écraser les verrous</button></div></details>)}</div>:<div className="merge-empty">Aucune fusion compatible pour le moment. Les capacités, séparations ou placements imposés empêchent le rapprochement.</div>}</details><details className={`unplaced-panel ${unplacedGuests.length ? "has-unplaced" : "complete"}`}><summary><div><small>SUIVI DU PLACEMENT</small><b>Reste à placer</b></div><strong>{unplacedGuests.length}</strong></summary>{unplacedGuests.length ? <><div className="unplaced-actions"><b>Diagnostic des blocages</b><button onClick={()=>setTab("Règles")}>Gérer les règles →</button></div><div className="unplaced-list">{unplacedGuests.map(guest=><span key={guest.id}>{guest.name}<small>{guest.age} · {guest.group}</small><em>{placementIssues[guest.id] || "Recalculez le plan pour identifier le blocage"}</em></span>)}</div></> : <p>Tout le monde a une table.</p>}</details><div className="planboard">{tableNames.map((t,i)=>{const seated=guests.filter(g=>g.table===i+1&&g.status!=="Désisté"&&g.status!=="Doublon");const tableCapacity=getTableCapacity(i+1);return <article className="tablecard" key={t.name}><div className="tabletitle"><div><small>{i===0?"TABLE 0 · TABLE DES MARIÉS":`TABLE ${i}`}</small><h2>{t.name}</h2><p>« {t.motto} »</p></div><b>{seated.length}/{tableCapacity}</b></div><div className="seats">{seated.map(g=><button key={g.id} disabled={!isAuthenticated} className={g.lockedTable ? "seat-imposed" : g.overrideTable ? "seat-locked" : "seat-auto"} onClick={()=>{setEditingTable(i+1);setTableGuestQuery("");}}><span>{g.name.split(" ").map(n=>n[0]).join("")}</span>{displayGuestName(g)}<small>{g.age} · {g.lockedTable ? "Placement imposé" : g.overrideTable ? "🔒 Manuel" : `✦ Auto-fill · ${g.group}`}</small></button>)}{Array.from({length:Math.max(0,Math.min(tableCapacity-seated.length,2))}).map((_,j)=><button className="empty" key={j} onClick={()=>{setEditingTable(i+1);setTableGuestQuery("");}}>＋ Place libre</button>)}</div>{editingTable===i+1&&<div className="direct-table-editor"><div className="direct-editor-title"><div><b>Modifier la table {i}</b><small>Ajoutez, déplacez ou retirez des invités. Couples et jumeaux suivent automatiquement.</small></div><button onClick={()=>setEditingTable(null)}>×</button></div><div className="direct-current">{seated.map(g=><span key={g.id}>{g.name}{g.lockedTable?<small>Placement imposé</small>:<div className="direct-seat-actions"><button onClick={()=>togglePositionLock(g.id)}>{g.overrideTable?"Déverrouiller":"Verrouiller"}</button><button onClick={()=>removeDirectly(g.id)}>Retirer</button></div>}</span>)}</div><input autoFocus value={tableGuestQuery} onChange={e=>setTableGuestQuery(e.target.value)} placeholder="Rechercher un invité à ajouter ou déplacer…"/><div className="direct-suggestion-label"><b>Suggestions pour cette table</b><small>Non placés en priorité · âge, langues et affiliation</small></div><div className="direct-candidates">{guests.filter(g=>g.status!=="Désisté"&&g.status!=="Doublon"&&!g.lockedTable&&g.table!==i+1&&g.name.toLowerCase().includes(tableGuestQuery.toLowerCase())).map(g=>({guest:g,fit:tableCandidateFit(g,i+1)})).sort((a,b)=>Number(Boolean(a.guest.table))-Number(Boolean(b.guest.table))||Number(b.fit.compatible)-Number(a.fit.compatible)||b.fit.score-a.fit.score||a.guest.name.localeCompare(b.guest.name)).slice(0,30).map(({guest:g,fit})=><button key={g.id} disabled={!isAuthenticated} className={!fit.compatible?"candidate-incompatible":""} onClick={()=>placeDirectly(g.id,i+1)}><div><span>{g.name}</span><strong>{fit.compatible?`${fit.score}%`:"Bloqué"}</strong></div><small>{g.table?`Table ${displayTableNumber(g.table)} · déplacer`:`Reste à placer`} · {fit.reasons.join(" · ")}</small></button>)}</div></div>}<footer><span>{seated.some(g=>g.lockedTable) ? <b>Placements imposés</b> : <>Table modifiable</>}</span><button onClick={()=>{setEditingTable(i+1);setTableGuestQuery("");}}>Modifier la table</button></footer></article>})}</div></section>}

      {tab === "Plan de salle" && <section className="page room-page"><div className="heading"><div><p className="eyebrow">DISPOSITION DE LA SALLE · D’APRÈS LA PHOTO</p><h1>Plan visuel de la salle</h1><p>{isAuthenticated?"Choisissez une table sur chaque emplacement. Une réattribution échange automatiquement les deux tables.":"Consultez la disposition des tables et leurs invités dans la salle."}</p></div><div className="room-heading-actions">{iterationControls}<button className="outline" onClick={()=>{setRoomAssignments(Object.fromEntries(defaultRoomPositions.map(position=>[position.slot,position.slot+1])));setRoomPositions(defaultRoomPositions);notify("Disposition de la photo restaurée")}}>↶ Réinitialiser le plan</button></div></div><div className="room-layout" onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="move"}} onDrop={e=>{e.preventDefault();if(draggedRoomSlot!==null)moveRoomPosition(draggedRoomSlot,e.clientX,e.clientY,e.currentTarget.getBoundingClientRect());setDraggedRoomSlot(null)}}><div className="room-feature honor-backdrop">Backdrop · coin photo</div><div className="room-feature dance-floor">Piste<br/>de danse</div><div className="room-feature left-screen" aria-hidden="true"></div><div className="room-feature right-screen" aria-hidden="true"></div><div className="room-feature bar">Bar</div><div className="room-feature dj">DJ</div><div className="room-feature entrance">Entrée</div>{roomPositions.map(position=>{const internalTable=roomAssignments[position.slot]??position.slot+1;const seated=guests.filter(g=>g.table===internalTable&&g.status!=="Désisté"&&g.status!=="Doublon");return <article key={position.slot} tabIndex={0} className={`room-table ${position.slot===0?"honor-table":""} ${position.y<20?"tooltip-below":""} ${draggedRoomSlot===position.slot?"is-dragging":""}`} style={{left:`${position.x}%`,top:`${position.y}%`}}><b>{position.slot===0?"Table 0 · Mariés":`Emplacement ${position.slot}`}</b><strong>{tableNames[internalTable-1]?.name}</strong><small>{seated.length}/{getTableCapacity(internalTable)} personnes</small><button type="button" className="room-drag-handle" draggable onDragStart={e=>{setDraggedRoomSlot(position.slot);e.dataTransfer.effectAllowed="move"}} onDragEnd={()=>setDraggedRoomSlot(null)}>⠿ Déplacer</button>{position.slot>0&&<select aria-label={`Table installée à l’emplacement ${position.slot}`} value={internalTable} onChange={e=>assignTableToRoomSlot(position.slot,Number(e.target.value))}>{tableNames.slice(1).map((table,index)=><option key={table.name} value={index+2}>Table {index+1} · {table.name}</option>)}</select>}<div className="room-tooltip" role="tooltip"><b>Invités de la table</b>{seated.length?<ul>{seated.map(guest=><li key={guest.id}>{displayGuestName(guest)}<small>{guest.age} · {guest.group}</small></li>)}</ul>:<p>Aucun invité placé</p>}</div></article>})}</div><p className="room-note">Disposition approximative reproduite depuis le croquis. La table 0 reste fixée en haut ; les tables 1 à 26 peuvent être échangées librement.</p></section>}

      {isAuthenticated && tab === "Tables & devises" && <section className="page narrow">
        <div className="heading"><div><p className="eyebrow">L'IDENTITÉ DE VOTRE RÉCEPTION</p><h1>Tables & devises</h1><p>Chaque modification est sauvegardée automatiquement et utilisée dans les plans et PDF.</p></div></div>
        <div className="table-swap-tool"><div><small>ÉCHANGER DEUX IDENTITÉS</small><b>Permuter les noms et devises</b><p>Les invités et les capacités restent à leur table actuelle.</p></div><select aria-label="Première table à échanger" value={tableSwapFrom} onChange={event=>setTableSwapFrom(Number(event.target.value))}>{tableNames.map((table,index)=><option key={`from-${index}`} value={index+1}>Table {index} · {table.name}</option>)}</select><span>⇄</span><select aria-label="Deuxième table à échanger" value={tableSwapTo} onChange={event=>setTableSwapTo(Number(event.target.value))}>{tableNames.map((table,index)=><option key={`to-${index}`} value={index+1}>Table {index} · {table.name}</option>)}</select><button className="primary" onClick={swapTableIdentities}>Échanger</button></div>
        <div className="settingsgrid">{tableNames.map((t,i)=>{const tableNumber=i+1;return <article key={tableNumber}><span>{String(displayTableNumber(tableNumber)).padStart(2,"0")}</span><label>Nom de la table<input value={t.name} onChange={event=>updateTableDefinition(i,"name",event.target.value)}/></label><label>Devise<input value={t.motto} onChange={event=>updateTableDefinition(i,"motto",event.target.value)}/></label><label>Capacité<input type="number" min={1} max={20} value={getTableCapacity(tableNumber)} onChange={e=>{const next=Math.max(1,Math.min(20,Number(e.target.value)||1));setTableCapacities(values=>({...values,[tableNumber]:next}));}}/></label><button onClick={()=>notify(`${t.name} est sauvegardée automatiquement`)}>Enregistré</button></article>})}</div>
      </section>}

      {isAuthenticated && tab === "Règles" && <section className="page narrow"><div className="heading"><div><p className="eyebrow">LE MOTEUR D'ÉQUILIBRE</p><h1>Règles & priorités</h1><p>Les obligations passent toujours avant les préférences. Chaque changement est sauvegardé localement.</p></div></div><div className="rules accordion-list"><details className="rule-accordion" open><summary><span>＋ Ajouter une séparation</span><b>Nouvelle exclusion</b></summary><div className="accordion-content"><div className="rule-builder"><span className="rule-kind">À séparer</span><input list="rule-guest-a" value={ruleA} onChange={e=>setRuleA(e.target.value)} placeholder="Premier invité…"/><datalist id="rule-guest-a">{guests.map(g=><option key={g.id} value={g.name}/>)}</datalist><input list="rule-guest-b" value={ruleB} onChange={e=>setRuleB(e.target.value)} placeholder="Deuxième invité…"/><datalist id="rule-guest-b">{guests.map(g=><option key={g.id} value={g.name}/>)}</datalist><button className="primary" onClick={addRule}>＋ Ajouter</button></div></div></details><details className="rule-accordion"><summary><span>💍 Couples</span><b>{coupleRules.length}</b></summary><div className="accordion-content">{coupleRules.length ? coupleRules.map(group=><div className="rule couple-rule" key={group.map(g=>g.id).sort().join("-")}><b>Couple</b><p>{group.map(g=>g.name).join(" + ")}</p><span>Même table</span><button aria-label="Supprimer le couple" onClick={()=>removeTogetherGroup(group)}>×</button></div>) : <p className="empty-rules">Aucun couple enregistré.</p>}</div></details><details className="rule-accordion"><summary><span>↔ À séparer</span><b>{separationRules.length}</b></summary><div className="accordion-content">{separationRules.length ? separationRules.map(rule=>{const a=guests.find(g=>g.id===rule.aId);const b=guests.find(g=>g.id===rule.bId);return a&&b?<div className="rule separate-rule" key={rule.id}><b>Exclusion</b><p>{a.name} ≠ {b.name}</p><span>Tables distinctes</span><button aria-label="Supprimer l’exclusion" onClick={()=>setSeparationRules(rules=>rules.filter(item=>item.id!==rule.id))}>×</button></div>:null}) : <p className="empty-rules">Aucune séparation enregistrée.</p>}</div></details><details className="rule-accordion"><summary><span>⚖ Critères d’équilibre</span><b>{Object.keys(priorities).length}</b></summary><div className="accordion-content">{Object.entries(priorities).map(([name,value])=><div className="slider" key={name}><label><b>{name}</b><span>Priorité {value>70?"forte":value>40?"moyenne":"faible"}</span></label><input type="range" min="0" max="100" value={value} onChange={e=>setPriorities(items=>({...items,[name]:Number(e.target.value)}))}/><output>{value}%</output></div>)}</div></details></div></section>}
      {showLogin&&!isAuthenticated&&<div className="modal-backdrop auth-modal" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setShowLogin(false)}}><section className="access-card" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button className="auth-close" type="button" aria-label="Fermer" onClick={()=>setShowLogin(false)}>×</button><div className="access-brand"><span className="brandmark">P</span><div><strong>Place Parfaite</strong><small>MODE ÉDITION</small></div></div><p className="eyebrow">ACCÈS PRIVÉ</p><h1 id="auth-title">Se connecter</h1><p>Entrez le mot de passe partagé pour modifier le plan.</p><form onSubmit={authenticate}><label htmlFor="access-password">Mot de passe</label><input id="access-password" type="password" autoComplete="current-password" autoFocus value={accessPassword} onChange={event=>{setAccessPassword(event.target.value);setAccessError("");}} aria-invalid={Boolean(accessError)} aria-describedby={accessError?"access-error":undefined}/>{accessError&&<span id="access-error" role="alert">{accessError}</span>}<button className="primary" type="submit">Passer en mode édition</button></form></section></div>}
      {guestModalOpen&&<div className="modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setGuestModalOpen(false)}}><section className="guest-modal" role="dialog" aria-modal="true" aria-labelledby="new-guest-title"><div className="modal-handle" aria-hidden="true"/><header><div><p className="eyebrow">{editingGuestId!==null?"MODIFICATION":"NOUVELLE FICHE"}</p><h2 id="new-guest-title">{editingGuestId!==null?"Modifier l’invité":"Ajouter un invité"}</h2></div><button type="button" aria-label="Fermer" onClick={()=>setGuestModalOpen(false)}>×</button></header><form onSubmit={saveGuest}><label className="wide">Nom complet<input autoFocus required value={newGuest.name} onChange={event=>setNewGuest(value=>({...value,name:event.target.value}))} placeholder="Ex. Jeanne Dupont"/></label><label>Statut<select value={newGuest.status} onChange={event=>setNewGuest(value=>({...value,status:event.target.value}))}>{statuses.map(status=><option key={status}>{status}</option>)}</select></label><label>Tranche d’âge<select value={newGuest.age} onChange={event=>setNewGuest(value=>({...value,age:event.target.value}))}>{ages.map(age=><option key={age}>{age}</option>)}</select></label><label>Affiliation<input list="new-guest-groups" value={newGuest.group} onChange={event=>setNewGuest(value=>({...value,group:event.target.value}))}/><datalist id="new-guest-groups">{groups.map(group=><option key={group} value={group}/>)}</datalist></label><label>Genre<select required value={newGuest.gender} onChange={event=>setNewGuest(value=>({...value,gender:event.target.value}))}><option value="" disabled>Choisir…</option>{genders.map(gender=><option key={gender}>{gender}</option>)}</select></label><fieldset className="wide"><legend>Langues parlées</legend><div className="choice-chips">{languages.map(language=><label key={language}><input type="checkbox" checked={newGuest.languages.includes(language)} onChange={()=>setNewGuest(value=>({...value,languages:value.languages.includes(language)?value.languages.filter(item=>item!==language):[...value.languages,language]}))}/><span>{language}</span></label>)}</div></fieldset><footer><button type="button" className="outline" onClick={()=>setGuestModalOpen(false)}>Annuler</button><button type="submit" className="primary">{editingGuestId!==null?"Enregistrer":"Ajouter l’invité"}</button></footer></form></section></div>}
      {toast && <div className="toast">✓ {toast}</div>}
    </main>
  );
}
