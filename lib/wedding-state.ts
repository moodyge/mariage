import { sql } from "@/lib/neon-http";

export type WeddingState = {
  guests: unknown[];
  tables: unknown[];
  capacity: number;
  tableCapacities: Record<string, number>;
  separationRules: unknown[];
  priorities: Record<string, number>;
  roomAssignments: Record<string, number>;
  roomPositions: unknown[];
  iterations: Record<string, unknown>;
  activeIteration: number;
};

export async function loadWeddingState() {
  const result = await sql<{ data: WeddingState }>(`
    select jsonb_build_object(
      'guests', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', g.id, 'name', g.name, 'status', g.status, 'age', g.age_group,
        'group', g.affiliation, 'gender', g.gender,
        'language', array_to_string(g.languages, ' · '), 'tags', to_jsonb(g.tags),
        'table', g.table_id, 'lockedTable', g.locked_table_id,
        'overrideTable', g.override_table_id, 'pairId', g.pair_id,
        'pairType', g.pair_type, 'partner', g.partner, 'coupleId', g.couple_id,
        'couplePartner', g.couple_partner
      )) order by lower(g.name), g.id) from wedding_guests g), '[]'::jsonb),
      'tables', coalesce((select jsonb_agg(jsonb_build_object(
        'name', t.name, 'motto', t.motto, 'capacity', t.capacity
      ) order by t.id) from wedding_tables t), '[]'::jsonb),
      'capacity', coalesce(s.default_capacity, 8),
      'tableCapacities', coalesce((select jsonb_object_agg(t.id::text, t.capacity) from wedding_tables t), '{}'::jsonb),
      'separationRules', coalesce((select jsonb_agg(jsonb_build_object(
        'id', r.id, 'aId', r.guest_a_id, 'bId', r.guest_b_id
      ) order by r.id) from wedding_separation_rules r), '[]'::jsonb),
      'priorities', coalesce(s.priorities, '{}'::jsonb),
      'roomAssignments', coalesce(s.room_assignments, '{}'::jsonb),
      'roomPositions', coalesce(s.room_positions, '[]'::jsonb),
      'iterations', coalesce(s.iterations, '{}'::jsonb),
      'activeIteration', coalesce(s.active_iteration, 1)
    ) as data
    from wedding_settings s where s.singleton = true
  `);
  return result.rows?.[0]?.data;
}

export async function saveWeddingState(state: unknown) {
  const payload = JSON.stringify(state);
  await sql(`
    with payload as (select $1::jsonb as value),
    saved_tables as (
      insert into wedding_tables (id, name, motto, capacity, updated_at)
      select ordinality::smallint, item->>'name', coalesce(item->>'motto', ''),
        coalesce(nullif(item->>'capacity', '')::smallint,
          nullif((p.value->'tableCapacities'->>ordinality::text), '')::smallint,
          nullif(p.value->>'capacity', '')::smallint, 8), now()
      from payload p cross join lateral jsonb_array_elements(p.value->'tables') with ordinality as x(item, ordinality)
      on conflict (id) do update set name=excluded.name, motto=excluded.motto,
        capacity=coalesce(nullif((select value->'tableCapacities'->>wedding_tables.id::text from payload), '')::smallint, excluded.capacity),
        updated_at=now()
      returning id
    ),
    saved_guests as (
      insert into wedding_guests (
        id,name,status,age_group,affiliation,gender,languages,tags,table_id,
        locked_table_id,override_table_id,pair_id,pair_type,partner,couple_id,couple_partner,updated_at
      )
      select (g->>'id')::bigint,
        regexp_replace(trim(g->>'name'), '^(monsieur|madame|mademoiselle|mr|mrs|mlle|mme|m)\\.?\\s+', '', 'i'),
        coalesce(g->>'status','À définir'), coalesce(g->>'age','À définir'),
        coalesce(g->>'group','À définir'), coalesce(g->>'gender','Non précisé'),
        case when coalesce(g->>'language','')='' then array['Français']::text[]
          else regexp_split_to_array(g->>'language','\\s*·\\s*') end,
        coalesce(array(select jsonb_array_elements_text(coalesce(g->'tags','[]'::jsonb))), array[]::text[]),
        nullif(g->>'table','')::smallint, nullif(g->>'lockedTable','')::smallint,
        nullif(g->>'overrideTable','')::smallint, nullif(g->>'pairId',''), nullif(g->>'pairType',''),
        nullif(regexp_replace(trim(coalesce(g->>'partner','')), '^(monsieur|madame|mademoiselle|mr|mrs|mlle|mme|m)\\.?\\s+', '', 'i'), ''),
        nullif(g->>'coupleId',''),
        nullif(regexp_replace(trim(coalesce(g->>'couplePartner','')), '^(monsieur|madame|mademoiselle|mr|mrs|mlle|mme|m)\\.?\\s+', '', 'i'), ''), now()
      from payload p cross join lateral jsonb_array_elements(p.value->'guests') g
      on conflict(id) do update set name=excluded.name,status=excluded.status,age_group=excluded.age_group,
        affiliation=excluded.affiliation,gender=excluded.gender,languages=excluded.languages,tags=excluded.tags,
        table_id=excluded.table_id,locked_table_id=excluded.locked_table_id,override_table_id=excluded.override_table_id,
        pair_id=excluded.pair_id,pair_type=excluded.pair_type,partner=excluded.partner,couple_id=excluded.couple_id,
        couple_partner=excluded.couple_partner,updated_at=now()
      returning id
    ),
    saved_rules as (
      insert into wedding_separation_rules(id,guest_a_id,guest_b_id)
      select r->>'id',(r->>'aId')::bigint,(r->>'bId')::bigint
      from payload p cross join lateral jsonb_array_elements(coalesce(p.value->'separationRules','[]'::jsonb)) r
      cross join (select count(*) from saved_guests) dependency
      on conflict(id) do update set guest_a_id=excluded.guest_a_id, guest_b_id=excluded.guest_b_id
      returning id
    ),
    removed_rules as (
      delete from wedding_separation_rules r using (select count(*) from saved_rules) dependency
      where not exists (
        select 1 from payload p cross join lateral jsonb_array_elements(coalesce(p.value->'separationRules','[]'::jsonb)) x
        where x->>'id'=r.id
      ) returning r.id
    ),
    removed_guests as (
      delete from wedding_guests g using (select count(*) from removed_rules) dependency
      where not exists (
        select 1 from payload p cross join lateral jsonb_array_elements(p.value->'guests') x
        where (x->>'id')::bigint=g.id
      ) returning g.id
    ),
    saved_settings as (
      insert into wedding_settings(singleton,default_capacity,priorities,room_assignments,room_positions,iterations,active_iteration,updated_at)
      select true,coalesce(nullif(value->>'capacity','')::smallint,8),coalesce(value->'priorities','{}'),
        coalesce(value->'roomAssignments','{}'),coalesce(value->'roomPositions','[]'),coalesce(value->'iterations','{}'),
        case when value->>'activeIteration'='2' then 2 else 1 end,now() from payload
      on conflict(singleton) do update set default_capacity=excluded.default_capacity,priorities=excluded.priorities,
        room_assignments=excluded.room_assignments,room_positions=excluded.room_positions,iterations=excluded.iterations,
        active_iteration=excluded.active_iteration,updated_at=now() returning singleton
    )
    select (select count(*) from saved_guests) as guests_saved,
      (select count(*) from saved_tables) as tables_saved,
      (select count(*) from saved_settings) as settings_saved,
      (select count(*) from removed_guests) as guests_removed
  `, [payload]);
}
