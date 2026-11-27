-- Portfolio read and atomic whole-section replacement RPCs.
-- All functions use fully qualified names and a fixed empty search_path.
begin;

create or replace function public.get_public_portfolio()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'profile', coalesce((
      select jsonb_build_object(
        'name', p.name,
        'titles', to_jsonb(p.titles),
        'description', p.description,
        'aboutTitle', p.about_title,
        'aboutText', p.about_text,
        'aboutEducation', p.about_education,
        'aboutProjects', p.about_projects
      )
      from public.portfolio_profile p
      where p.singleton_id = 1
    ), '{}'::jsonb),
    'skills', jsonb_build_object(
      'frontend', coalesce((
        select jsonb_agg(jsonb_build_object(
          'name', s.name, 'percentage', s.percentage, 'icon', s.icon
        ) order by s.sort_order)
        from public.portfolio_skills s where s.category = 'frontend'
      ), '[]'::jsonb),
      'backend', coalesce((
        select jsonb_agg(jsonb_build_object(
          'name', s.name, 'percentage', s.percentage, 'icon', s.icon
        ) order by s.sort_order)
        from public.portfolio_skills s where s.category = 'backend'
      ), '[]'::jsonb)
    ),
    'education', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', e.date_label, 'title', e.title, 'subtitle', e.subtitle,
        'desc', e.description, 'bullets', to_jsonb(e.bullets),
        'tags', to_jsonb(e.tags), 'icon', e.icon
      ) order by e.sort_order)
      from public.portfolio_education e
    ), '[]'::jsonb),
    'experience', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', e.date_label, 'title', e.title, 'type', e.role_type,
        'typeClass', e.type_class, 'company', e.company,
        'bullets', to_jsonb(e.bullets), 'tags', to_jsonb(e.tags),
        'icon', e.icon, 'themeColor', e.theme_color,
        'themeColorRGB', e.theme_color_rgb
      ) order by e.sort_order)
      from public.portfolio_experience e
    ), '[]'::jsonb),
    'projects', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', p.name, 'category', p.category, 'language', p.language,
        'description', p.description, 'html_url', p.html_url,
        'homepage', p.homepage, 'image', p.image, 'video', p.video,
        'stargazers_count', p.stargazers_count, 'forks_count', p.forks_count
      ) order by p.sort_order)
      from public.portfolio_projects p
    ), '[]'::jsonb),
    'certificates', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', c.name, 'issuer', c.issuer, 'date', c.date_label,
        'credential_url', c.credential_url, 'image', c.image, 'pdf', c.pdf
      ) order by c.sort_order)
      from public.portfolio_certificates c
    ), '[]'::jsonb)
  );
$$;

create or replace function public.replace_portfolio_profile(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(485017392);
  if p_payload is null
     or pg_catalog.jsonb_typeof(p_payload) is distinct from 'object'
     or pg_catalog.jsonb_typeof(p_payload -> 'titles') is distinct from 'array' then
    raise exception 'invalid profile payload';
  end if;

  insert into public.portfolio_profile (
    singleton_id, name, titles, description, about_title,
    about_text, about_education, about_projects, import_fingerprint, updated_at
  ) values (
    1,
    p_payload ->> 'name',
    array(select v from pg_catalog.jsonb_array_elements_text(p_payload -> 'titles') as t(v)),
    p_payload ->> 'description',
    p_payload ->> 'aboutTitle',
    p_payload ->> 'aboutText',
    p_payload ->> 'aboutEducation',
    p_payload ->> 'aboutProjects',
    null,
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
    import_fingerprint = null,
    updated_at = excluded.updated_at;
end;
$$;

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

revoke all on function public.get_public_portfolio() from public, anon, authenticated, service_role;
revoke all on function public.replace_portfolio_profile(jsonb) from public, anon, authenticated, service_role;
revoke all on function public.replace_portfolio_skills(jsonb) from public, anon, authenticated, service_role;
revoke all on function public.replace_portfolio_education(jsonb) from public, anon, authenticated, service_role;
revoke all on function public.replace_portfolio_experience(jsonb) from public, anon, authenticated, service_role;
revoke all on function public.replace_portfolio_projects(jsonb) from public, anon, authenticated, service_role;
revoke all on function public.replace_portfolio_certificates(jsonb) from public, anon, authenticated, service_role;

grant execute on function public.get_public_portfolio() to service_role;
grant execute on function public.replace_portfolio_profile(jsonb) to service_role;
grant execute on function public.replace_portfolio_skills(jsonb) to service_role;
grant execute on function public.replace_portfolio_education(jsonb) to service_role;
grant execute on function public.replace_portfolio_experience(jsonb) to service_role;
grant execute on function public.replace_portfolio_projects(jsonb) to service_role;
grant execute on function public.replace_portfolio_certificates(jsonb) to service_role;

commit;
