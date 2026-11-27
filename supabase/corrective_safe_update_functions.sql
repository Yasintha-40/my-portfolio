-- Replace six existing RPC definitions without changing data or grants.
-- Execute manually as the trusted owner after review.
begin;

create or replace function public.replace_portfolio_skills(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(485017392);
  if p_payload is null
     or pg_catalog.jsonb_typeof(p_payload) is distinct from 'object'
     or pg_catalog.jsonb_typeof(p_payload -> 'frontend') is distinct from 'array'
     or pg_catalog.jsonb_typeof(p_payload -> 'backend') is distinct from 'array' then
    raise exception 'invalid skills payload';
  end if;

  delete from public.portfolio_skills where id is not null;
  insert into public.portfolio_skills (id, category, sort_order, name, percentage, icon, updated_at)
  select
    md5('skills:' || q.category || ':' || q.ordinality)::uuid,
    q.category,
    (q.ordinality - 1)::integer,
    q.item ->> 'name',
    (q.item ->> 'percentage')::smallint,
    q.item ->> 'icon',
    pg_catalog.clock_timestamp()
  from (
    select 'frontend'::text as category, x.item, x.ordinality
    from pg_catalog.jsonb_array_elements(p_payload -> 'frontend') with ordinality as x(item, ordinality)
    union all
    select 'backend'::text as category, x.item, x.ordinality
    from pg_catalog.jsonb_array_elements(p_payload -> 'backend') with ordinality as x(item, ordinality)
  ) as q;

  update public.portfolio_profile
  set import_fingerprint = null, updated_at = pg_catalog.clock_timestamp()
  where singleton_id = 1;
end;
$$;

create or replace function public.replace_portfolio_education(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(485017392);
  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) is distinct from 'array' then
    raise exception 'invalid education payload';
  end if;

  delete from public.portfolio_education where id is not null;
  insert into public.portfolio_education (
    id, sort_order, date_label, title, subtitle, description,
    bullets, tags, icon, updated_at
  )
  select
    md5('education:' || x.ordinality)::uuid,
    (x.ordinality - 1)::integer,
    x.item ->> 'date', x.item ->> 'title', x.item ->> 'subtitle', x.item ->> 'desc',
    array(select b.value from pg_catalog.jsonb_array_elements_text(coalesce(x.item -> 'bullets', '[]'::jsonb)) with ordinality as b(value, ordinality) order by b.ordinality),
    array(select t.value from pg_catalog.jsonb_array_elements_text(coalesce(x.item -> 'tags', '[]'::jsonb)) with ordinality as t(value, ordinality) order by t.ordinality),
    x.item ->> 'icon', pg_catalog.clock_timestamp()
  from pg_catalog.jsonb_array_elements(p_payload) with ordinality as x(item, ordinality);

  update public.portfolio_profile
  set import_fingerprint = null, updated_at = pg_catalog.clock_timestamp()
  where singleton_id = 1;
end;
$$;

create or replace function public.replace_portfolio_experience(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(485017392);
  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) is distinct from 'array' then
    raise exception 'invalid experience payload';
  end if;

  delete from public.portfolio_experience where id is not null;
  insert into public.portfolio_experience (
    id, sort_order, date_label, title, role_type, type_class, company,
    bullets, tags, icon, theme_color, theme_color_rgb, updated_at
  )
  select
    md5('experience:' || x.ordinality)::uuid,
    (x.ordinality - 1)::integer,
    x.item ->> 'date', x.item ->> 'title', x.item ->> 'type', x.item ->> 'typeClass',
    x.item ->> 'company',
    array(select b.value from pg_catalog.jsonb_array_elements_text(coalesce(x.item -> 'bullets', '[]'::jsonb)) with ordinality as b(value, ordinality) order by b.ordinality),
    array(select t.value from pg_catalog.jsonb_array_elements_text(coalesce(x.item -> 'tags', '[]'::jsonb)) with ordinality as t(value, ordinality) order by t.ordinality),
    x.item ->> 'icon', x.item ->> 'themeColor', x.item ->> 'themeColorRGB',
    pg_catalog.clock_timestamp()
  from pg_catalog.jsonb_array_elements(p_payload) with ordinality as x(item, ordinality);

  update public.portfolio_profile
  set import_fingerprint = null, updated_at = pg_catalog.clock_timestamp()
  where singleton_id = 1;
end;
$$;

create or replace function public.replace_portfolio_projects(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(485017392);
  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) is distinct from 'array' then
    raise exception 'invalid projects payload';
  end if;

  delete from public.portfolio_projects where id is not null;
  insert into public.portfolio_projects (
    id, sort_order, name, category, language, description, html_url,
    homepage, image, video, stargazers_count, forks_count, updated_at
  )
  select
    md5('projects:' || x.ordinality)::uuid,
    (x.ordinality - 1)::integer,
    x.item ->> 'name', coalesce(x.item ->> 'category', 'Web App'),
    coalesce(x.item ->> 'language', ''), coalesce(x.item ->> 'description', ''),
    x.item ->> 'html_url', coalesce(x.item ->> 'homepage', ''),
    coalesce(x.item ->> 'image', ''), coalesce(x.item ->> 'video', ''),
    coalesce((x.item ->> 'stargazers_count')::integer, 0),
    coalesce((x.item ->> 'forks_count')::integer, 0),
    pg_catalog.clock_timestamp()
  from pg_catalog.jsonb_array_elements(p_payload) with ordinality as x(item, ordinality);

  update public.portfolio_profile
  set import_fingerprint = null, updated_at = pg_catalog.clock_timestamp()
  where singleton_id = 1;
end;
$$;

create or replace function public.replace_portfolio_certificates(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(485017392);
  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) is distinct from 'array' then
    raise exception 'invalid certificates payload';
  end if;

  delete from public.portfolio_certificates where id is not null;
  insert into public.portfolio_certificates (
    id, sort_order, name, issuer, date_label,
    credential_url, image, pdf, updated_at
  )
  select
    md5('certificates:' || x.ordinality)::uuid,
    (x.ordinality - 1)::integer,
    x.item ->> 'name', x.item ->> 'issuer', x.item ->> 'date',
    coalesce(x.item ->> 'credential_url', ''),
    coalesce(x.item ->> 'image', ''), coalesce(x.item ->> 'pdf', ''),
    pg_catalog.clock_timestamp()
  from pg_catalog.jsonb_array_elements(p_payload) with ordinality as x(item, ordinality);

  update public.portfolio_profile
  set import_fingerprint = null, updated_at = pg_catalog.clock_timestamp()
  where singleton_id = 1;
end;
$$;

create or replace function public.delete_contact_message(p_id text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
begin
  if p_id is not null and pg_catalog.length(p_id) > 64 then
    raise exception 'invalid contact message id';
  end if;
  if p_id is null then
    delete from public.contact_messages where id is not null;
  else
    delete from public.contact_messages where id = p_id;
  end if;
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

commit;
