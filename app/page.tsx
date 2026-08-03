"use client";

import { useMemo, useState } from "react";

type Guest = { id: number; name: string; age: string; group: string; gender: string; language: string; tags: string[]; table?: number };

const seed: Guest[] = [
  { id: 1, name: "Alice Martin", age: "25–34", group: "Famille de Léa", gender: "Femme", language: "FR · EN", tags: ["Témoin"], table: 1 },
  { id: 2, name: "Thomas Bernard", age: "25–34", group: "Amis de Marc", gender: "Homme", language: "FR", tags: ["Sport"], table: 1 },
  { id: 3, name: "Sophie Dubois", age: "55–64", group: "Famille de Marc", gender: "Femme", language: "FR", tags: ["Mobilité"], table: 2 },
  { id: 4, name: "Lucas Robert", age: "25–34", group: "Collègues", gender: "Homme", language: "FR · EN", tags: ["Musique"], table: 3 },
  { id: 5, name: "Emma Petit", age: "18–24", group: "Amis de Léa", gender: "Femme", language: "FR · ES", tags: ["Végétarien"], table: 1 },
  { id: 6, name: "Hugo Leroy", age: "35–44", group: "Famille de Léa", gender: "Homme", language: "FR", tags: ["Enfant +1"], table: 2 },
  { id: 7, name: "Camille Moreau", age: "35–44", group: "Collègues", gender: "Non précisé", language: "FR · EN", tags: ["Photo"], table: 3 },
  { id: 8, name: "Nina Garcia", age: "25–34", group: "Amis de Marc", gender: "Femme", language: "ES · FR", tags: ["Danse"], table: 1 },
];

const tableNames = [
  { name: "L'Olivier", motto: "Là où l'amour prend racine" },
  { name: "Les Étoiles", motto: "Toujours un peu plus haut" },
  { name: "La Bohème", motto: "Vivre, rire, aimer" },
  { name: "Le Jasmin", motto: "La douceur des beaux jours" },
];

export default function Home() {
  const [tab, setTab] = useState("Invités");
  const [guests, setGuests] = useState(seed);
  const [selected, setSelected] = useState<number[]>([1, 2]);
  const [capacity, setCapacity] = useState(8);
  const [query, setQuery] = useState("");
  const [generated, setGenerated] = useState(false);
  const [toast, setToast] = useState("");
  const filtered = useMemo(() => guests.filter(g => `${g.name} ${g.group}`.toLowerCase().includes(query.toLowerCase())), [guests, query]);

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2600); }
  function generate() {
    const count = Math.max(1, Math.ceil(guests.length / capacity));
    setGuests(gs => gs.map((g, i) => ({ ...g, table: (i % count) + 1 })));
    setGenerated(true); setTab("Plan de table"); notify("Nouveau plan généré en respectant les règles prioritaires");
  }
  function bulkGroup() {
    setGuests(gs => gs.map(g => selected.includes(g.id) ? { ...g, group: "Amis de Léa" } : g));
    notify(`${selected.length} invités modifiés`);
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="brandmark">P</span><div><strong>Place&nbsp;Parfaite</strong><small>LE PLAN DE TABLE, EN HARMONIE</small></div></div>
        <nav>{["Invités", "Plan de table", "Tables & devises", "Règles"].map(x => <button key={x} className={tab === x ? "active" : ""} onClick={() => setTab(x)}>{x}</button>)}</nav>
        <button className="outline" onClick={() => notify("Toutes les modifications sont enregistrées")}>Enregistrer</button>
      </header>

      {tab === "Invités" && <section className="page">
        <div className="heading"><div><p className="eyebrow">VOTRE MARIAGE · 14 JUIN 2027</p><h1>La liste des invités</h1><p>Organisez les affinités aujourd'hui, laissez l'algorithme trouver l'équilibre demain.</p></div><div className="actions"><label className="outline file">↑ Importer Excel<input type="file" accept=".xlsx,.xls,.csv" onChange={e => e.target.files?.[0] && notify(`${e.target.files[0].name} prêt à être importé`)} /></label><button className="primary" onClick={() => { const id = Math.max(...guests.map(g=>g.id))+1; setGuests([...guests,{id,name:"Nouvel invité",age:"25–34",group:"À définir",gender:"Non précisé",language:"FR",tags:[]}]); }}>＋ Ajouter un invité</button></div></div>
        <div className="stats"><article><span>INVITÉS</span><b>{guests.length}</b><small>sur 64 attendus</small></article><article><span>GROUPES</span><b>{new Set(guests.map(g=>g.group)).size}</b><small>affiliations identifiées</small></article><article><span>PLACEMENT</span><b>{generated ? "100%" : "62%"}</b><small>{generated ? "plan à jour" : "champs renseignés"}</small></article><article className="capacity"><span>CAPACITÉ PAR TABLE</span><div><button onClick={() => setCapacity(Math.max(2,capacity-1))}>−</button><b>{capacity}</b><button onClick={() => setCapacity(capacity+1)}>＋</button></div><small>Le plan sera recalculé à la demande</small></article></div>
        <div className="toolbar"><div className="search">⌕ <input aria-label="Rechercher" placeholder="Rechercher un invité, une famille…" value={query} onChange={e=>setQuery(e.target.value)} /></div><button className="filter">☷ Filtres <span>2</span></button><i></i><span>{selected.length} sélectionnés</span><button onClick={bulkGroup}>Modifier en lot</button><button onClick={()=>{setGuests(gs=>gs.filter(g=>!selected.includes(g.id)));setSelected([])}}>Supprimer</button></div>
        <div className="tablewrap"><table><thead><tr><th><input type="checkbox" checked={selected.length===guests.length} onChange={e=>setSelected(e.target.checked?guests.map(g=>g.id):[])} /></th><th>INVITÉ</th><th>TRANCHE D'ÂGE</th><th>AFFILIATION</th><th>GENRE</th><th>LANGUES</th><th>CARACTÉRISTIQUES</th><th></th></tr></thead><tbody>{filtered.map(g=><tr key={g.id}><td><input type="checkbox" checked={selected.includes(g.id)} onChange={()=>setSelected(s=>s.includes(g.id)?s.filter(id=>id!==g.id):[...s,g.id])}/></td><td><div className="person"><span>{g.name.split(" ").map(n=>n[0]).join("")}</span><div><b>{g.name}</b><small>Confirmé</small></div></div></td><td>{g.age}</td><td><em>{g.group}</em></td><td>{g.gender}</td><td>{g.language}</td><td>{g.tags.map(t=><mark key={t}>{t}</mark>)}</td><td>•••</td></tr>)}</tbody></table></div>
        <div className="bottom"><p><b>{guests.length} invités</b> · dernière modification à l'instant</p><button className="generate" onClick={generate}>✦ Générer le plan <span>→</span></button></div>
      </section>}

      {tab === "Plan de table" && <section className="page"><div className="heading"><div><p className="eyebrow">PROPOSITION {generated ? "NOUVELLEMENT CALCULÉE" : "DE TRAVAIL"}</p><h1>Votre plan de table</h1><p>Une composition équilibrée, modifiable par glisser-déposer ou par override.</p></div><button className="primary" onClick={generate}>✦ Recalculer le plan</button></div><div className="planboard">{tableNames.map((t,i)=>{const seated=guests.filter(g=>g.table===i+1);return <article className="tablecard" key={t.name}><div className="tabletitle"><div><small>TABLE {i+1}</small><h2>{t.name}</h2><p>« {t.motto} »</p></div><b>{seated.length}/{capacity}</b></div><div className="seats">{seated.map(g=><button key={g.id}><span>{g.name.split(" ").map(n=>n[0]).join("")}</span>{g.name}<small>{g.group}</small></button>)}{Array.from({length:Math.max(0,Math.min(capacity-seated.length,2))}).map((_,j)=><button className="empty" key={j}>＋ Place libre</button>)}</div><footer><span>Mixité <b>{Math.min(98,72+i*6)}%</b></span><button onClick={()=>notify(`Override activé pour ${t.name}`)}>Override</button></footer></article>})}</div></section>}

      {tab === "Tables & devises" && <section className="page narrow"><div className="heading"><div><p className="eyebrow">L'IDENTITÉ DE VOTRE RÉCEPTION</p><h1>Tables & devises</h1><p>Chaque table a son histoire. Modifiez son nom, sa devise et sa capacité.</p></div><button className="primary" onClick={()=>notify("Une nouvelle table a été ajoutée")}>＋ Ajouter une table</button></div><div className="settingsgrid">{tableNames.map((t,i)=><article key={t.name}><span>0{i+1}</span><label>Nom de la table<input defaultValue={t.name}/></label><label>Devise<input defaultValue={t.motto}/></label><label>Capacité<input type="number" defaultValue={capacity}/></label><button onClick={()=>notify(`Modifications de ${t.name} enregistrées`)}>Enregistrer</button></article>)}</div></section>}

      {tab === "Règles" && <section className="page narrow"><div className="heading"><div><p className="eyebrow">LE MOTEUR D'ÉQUILIBRE</p><h1>Règles & priorités</h1><p>Les obligations passent toujours avant les préférences. Ajustez le reste selon votre réception.</p></div><button className="primary" onClick={()=>notify("Nouvelle règle créée")}>＋ Nouvelle règle</button></div><div className="rules"><h2>Contraintes impératives</h2><div className="rule"><b>👥 À placer ensemble</b><p>Alice Martin + Thomas Bernard</p><span>Obligatoire</span></div><div className="rule"><b>↔ À séparer</b><p>Sophie Dubois ≠ Hugo Leroy</p><span>Obligatoire</span></div><h2>Critères d'équilibre</h2>{[["Mixité des affiliations",85],["Mixité de genre",72],["Affinités & centres d'intérêt",64],["Tranches d'âge",58],["Langues communes",50]].map(([n,v])=><div className="slider" key={String(n)}><label><b>{n}</b><span>Priorité {Number(v)>70?"forte":"moyenne"}</span></label><input type="range" defaultValue={Number(v)}/><output>{v}%</output></div>)}</div></section>}
      {toast && <div className="toast">✓ {toast}</div>}
    </main>
  );
}
