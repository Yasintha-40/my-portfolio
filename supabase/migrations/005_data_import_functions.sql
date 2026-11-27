-- One-time import from the current data.json only (never Git history).
-- Replaying an identical payload is a no-op. Different payloads cannot replace
-- populated portfolio data unless p_allow_overwrite is explicitly true.
begin;

create or replace function public.import_portfolio_json(
  p_payload jsonb,
  p_source_hash text,
  p_allow_overwrite boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing_hash text;
  v_has_portfolio boolean;
  v_row record;
  v_message_id text;
  v_message_count integer := 0;
  v_rows integer;
begin
  -- Serialize imports with section updates so the empty-database guard cannot race.
  perform pg_catalog.pg_advisory_xact_lock(485017392);
  if p_payload is null
     or pg_catalog.jsonb_typeof(p_payload) is distinct from 'object'
     or p_source_hash is null
     or p_source_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid import arguments';
  end if;

  if pg_catalog.jsonb_typeof(p_payload -> 'profile') is distinct from 'object'
     or pg_catalog.jsonb_typeof(p_payload #> '{profile,titles}') is distinct from 'array'
     or pg_catalog.jsonb_typeof(p_payload #> '{skills,frontend}') is distinct from 'array'
     or pg_catalog.jsonb_typeof(p_payload #> '{skills,backend}') is distinct from 'array'
     or pg_catalog.jsonb_typeof(p_payload -> 'education') is distinct from 'array'
     or pg_catalog.jsonb_typeof(p_payload -> 'experience') is distinct from 'array'
     or pg_catalog.jsonb_typeof(p_payload -> 'projects') is distinct from 'array'
     or pg_catalog.jsonb_typeof(p_payload -> 'certificates') is distinct from 'array'
     or (p_payload ? 'messages' and pg_catalog.jsonb_typeof(p_payload -> 'messages') is distinct from 'array') then
    raise exception 'invalid portfolio JSON structure';
  end if;

  select p.import_fingerprint
  into v_existing_hash
  from public.portfolio_profile p
  where p.singleton_id = 1;

  if v_existing_hash = p_source_hash then
    return jsonb_build_object('status', 'unchanged', 'source_hash', p_source_hash);
  end if;

  select exists (
    select 1 from public.portfolio_profile
    union all select 1 from public.portfolio_skills
    union all select 1 from public.portfolio_education
    union all select 1 from public.portfolio_experience
    union all select 1 from public.portfolio_projects
    union all select 1 from public.portfolio_certificates
  ) into v_has_portfolio;

  if v_has_portfolio and not coalesce(p_allow_overwrite, false) then
    raise exception 'portfolio data already exists; explicit overwrite authorization is required';
  end if;

  -- An empty import needs no deletes. Preserve the existing guarded overwrite
  -- behavior for separately authorized callers, using explicit row criteria.
  if v_has_portfolio and coalesce(p_allow_overwrite, false) then
    delete from public.portfolio_skills where id is not null;
    delete from public.portfolio_education where id is not null;
    delete from public.portfolio_experience where id is not null;
    delete from public.portfolio_projects where id is not null;
    delete from public.portfolio_certificates where id is not null;
  end if;

  insert into public.portfolio_profile (
    singleton_id, name, titles, description, about_title,
    about_text, about_education, about_projects, import_fingerprint, updated_at
  ) values (
    1,
    p_payload #>> '{profile,name}',
    array(select x.value from pg_catalog.jsonb_array_elements_text(p_payload #> '{profile,titles}') as x(value)),
    p_payload #>> '{profile,description}',
    p_payload #>> '{profile,aboutTitle}',
    p_payload #>> '{profile,aboutText}',
    p_payload #>> '{profile,aboutEducation}',
    p_payload #>> '{profile,aboutProjects}',
    p_source_hash,
    pg_catalog.clock_timestamp()
  )
  on conflict (singleton_id) do update set
    name = excluded.name,
    titles = excluded.titles,
    description = excluded.description,
    about_title = excluded.about_title,
    about_text = excluded.about_text,
    about_education = excluded.about_education,
    about_projects = excluded.about_projects,
    import_fingerprint = excluded.import_fingerprint,
    updated_at = excluded.updated_at;

  insert into public.portfolio_skills (id, category, sort_order, name, percentage, icon)
  select
    md5('skills:' || q.category || ':' || q.ordinality)::uuid,
    q.category,
    (q.ordinality - 1)::integer,
    q.item ->> 'name',
    (q.item ->> 'percentage')::smallint,
    q.item ->> 'icon'
  from (
    select 'frontend'::text as category, x.item, x.ordinality
    from pg_catalog.jsonb_array_elements(p_payload #> '{skills,frontend}') with ordinality as x(item, ordinality)
    union all
    select 'backend'::text as category, x.item, x.ordinality
    from pg_catalog.jsonb_array_elements(p_payload #> '{skills,backend}') with ordinality as x(item, ordinality)
  ) as q;

  insert into public.portfolio_education (
    id, sort_order, date_label, title, subtitle, description, bullets, tags, icon
  )
  select
    md5('education:' || x.ordinality)::uuid,
    (x.ordinality - 1)::integer,
    x.item ->> 'date', x.item ->> 'title', x.item ->> 'subtitle', x.item ->> 'desc',
    array(select b.value from pg_catalog.jsonb_array_elements_text(coalesce(x.item -> 'bullets', '[]'::jsonb)) with ordinality as b(value, ordinality) order by b.ordinality),
    array(select t.value from pg_catalog.jsonb_array_elements_text(coalesce(x.item -> 'tags', '[]'::jsonb)) with ordinality as t(value, ordinality) order by t.ordinality),
    x.item ->> 'icon'
  from pg_catalog.jsonb_array_elements(p_payload -> 'education') with ordinality as x(item, ordinality);

  insert into public.portfolio_experience (
    id, sort_order, date_label, title, role_type, type_class, company,
    bullets, tags, icon, theme_color, theme_color_rgb
  )
  select
    md5('experience:' || x.ordinality)::uuid,
    (x.ordinality - 1)::integer,
    x.item ->> 'date', x.item ->> 'title', x.item ->> 'type', x.item ->> 'typeClass',
    x.item ->> 'company',
    array(select b.value from pg_catalog.jsonb_array_elements_text(coalesce(x.item -> 'bullets', '[]'::jsonb)) with ordinality as b(value, ordinality) order by b.ordinality),
    array(select t.value from pg_catalog.jsonb_array_elements_text(coalesce(x.item -> 'tags', '[]'::jsonb)) with ordinality as t(value, ordinality) order by t.ordinality),
    x.item ->> 'icon', x.item ->> 'themeColor', x.item ->> 'themeColorRGB'
  from pg_catalog.jsonb_array_elements(p_payload -> 'experience') with ordinality as x(item, ordinality);

  insert into public.portfolio_projects (
    id, sort_order, name, category, language, description, html_url,
    homepage, image, video, stargazers_count, forks_count
  )
  select
    md5('projects:' || x.ordinality)::uuid,
    (x.ordinality - 1)::integer,
    x.item ->> 'name', coalesce(x.item ->> 'category', 'Web App'),
    coalesce(x.item ->> 'language', ''), coalesce(x.item ->> 'description', ''),
    x.item ->> 'html_url', coalesce(x.item ->> 'homepage', ''),
    coalesce(x.item ->> 'image', ''), coalesce(x.item ->> 'video', ''),
    coalesce((x.item ->> 'stargazers_count')::integer, 0),
    coalesce((x.item ->> 'forks_count')::integer, 0)
  from pg_catalog.jsonb_array_elements(p_payload -> 'projects') with ordinality as x(item, ordinality);

  insert into public.portfolio_certificates (
    id, sort_order, name, issuer, date_label, credential_url, image, pdf
  )
  select
    md5('certificates:' || x.ordinality)::uuid,
    (x.ordinality - 1)::integer,
    x.item ->> 'name', x.item ->> 'issuer', x.item ->> 'date',
    coalesce(x.item ->> 'credential_url', ''),
    coalesce(x.item ->> 'image', ''), coalesce(x.item ->> 'pdf', '')
  from pg_catalog.jsonb_array_elements(p_payload -> 'certificates') with ordinality as x(item, ordinality);

  -- Preserve messages only from this current payload. Existing IDs/read state
  -- are not overwritten. Reverse insertion makes the first JSON item newest.
  for v_row in
    select x.item, x.ordinality
    from pg_catalog.jsonb_array_elements(coalesce(p_payload -> 'messages', '[]'::jsonb)) with ordinality as x(item, ordinality)
    order by x.ordinality desc
  loop
    v_message_id := coalesce(
      v_row.item ->> 'id',
      md5('legacy-contact-message:' || v_row.ordinality)::uuid::text
    );
    insert into public.contact_messages (
      id, name, email, message, date_label, is_read
    ) values (
      v_message_id,
      v_row.item ->> 'name',
      v_row.item ->> 'email',
      v_row.item ->> 'message',
      coalesce(v_row.item ->> 'date', ''),
      coalesce((v_row.item ->> 'read')::boolean, false)
    ) on conflict (id) do nothing;
    get diagnostics v_rows = row_count;
    v_message_count := v_message_count + v_rows;
  end loop;

  return jsonb_build_object(
    'status', 'imported',
    'source_hash', p_source_hash,
    'current_file_messages_added', v_message_count
  );
end;
$$;

revoke all on function public.import_portfolio_json(jsonb, text, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.import_portfolio_json(jsonb, text, boolean)
  to service_role;

commit;
