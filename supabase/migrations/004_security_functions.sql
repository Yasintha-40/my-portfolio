-- Private message, session, and concurrency-safe rate-limit RPCs.
begin;

create or replace function public.insert_contact_message(
  p_id text,
  p_name text,
  p_email text,
  p_message text,
  p_date_label text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_id is null or pg_catalog.length(p_id) not between 1 and 64
     or p_name is null or p_email is null or p_message is null or p_date_label is null then
    raise exception 'invalid contact message';
  end if;

  insert into public.contact_messages (id, name, email, message, date_label)
  values (p_id, p_name, p_email, p_message, p_date_label);
end;
$$;

create or replace function public.list_contact_messages()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object(
      'id', m.id, 'name', m.name, 'email', m.email,
      'message', m.message, 'date', m.date_label, 'read', m.is_read
    ) order by m.sort_order desc),
    '[]'::jsonb
  )
  from public.contact_messages m;
$$;

create or replace function public.toggle_contact_message(p_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
begin
  if p_id is null or pg_catalog.length(p_id) > 64 then
    raise exception 'invalid contact message id';
  end if;
  update public.contact_messages
  set is_read = not is_read
  where id = p_id;
  get diagnostics v_rows = row_count;
  return v_rows = 1;
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

create or replace function public.cleanup_expired_admin_sessions(p_batch_limit integer default 500)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
begin
  if p_batch_limit is null or p_batch_limit not between 1 and 5000 then
    raise exception 'invalid cleanup batch size';
  end if;

  with stale as (
    select s.token_hash
    from public.admin_sessions s
    where s.expires_at < pg_catalog.clock_timestamp() - interval '1 day'
       or s.revoked_at < pg_catalog.clock_timestamp() - interval '1 day'
    order by s.expires_at
    limit p_batch_limit
    for update skip locked
  )
  delete from public.admin_sessions s using stale x
  where s.token_hash = x.token_hash;

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

create or replace function public.create_admin_session(
  p_token_hash text,
  p_csrf_token_hash text,
  p_ttl_seconds integer default 28800
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_expires_at timestamptz;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$'
     or p_csrf_token_hash is null or p_csrf_token_hash !~ '^[0-9a-f]{64}$'
     or p_ttl_seconds is null or p_ttl_seconds not between 60 and 86400 then
    raise exception 'invalid session parameters';
  end if;

  perform public.cleanup_expired_admin_sessions(100);
  v_expires_at := v_now + pg_catalog.make_interval(secs => p_ttl_seconds);
  insert into public.admin_sessions (token_hash, csrf_token_hash, created_at, expires_at)
  values (p_token_hash, p_csrf_token_hash, v_now, v_expires_at);
  return v_expires_at;
end;
$$;

create or replace function public.validate_admin_session(p_token_hash text)
returns table (csrf_token_hash text, expires_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  select s.csrf_token_hash, s.expires_at
  from public.admin_sessions s
  where p_token_hash is not null
    and p_token_hash ~ '^[0-9a-f]{64}$'
    and s.token_hash = p_token_hash
    and s.revoked_at is null
    and s.expires_at > pg_catalog.clock_timestamp();
$$;

create or replace function public.revoke_admin_session(p_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;
  update public.admin_sessions
  set revoked_at = coalesce(revoked_at, pg_catalog.clock_timestamp())
  where token_hash = p_token_hash and revoked_at is null;
  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_subject_hash text,
  p_max_requests integer,
  p_window_seconds integer
)
returns table (
  is_allowed boolean,
  remaining_count integer,
  retry_after_seconds integer,
  window_resets_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_reset_at timestamptz;
  v_now timestamptz;
  v_inserted integer;
begin
  if p_scope is null or p_scope not in ('login', 'contact', 'upload')
     or p_subject_hash is null or p_subject_hash !~ '^[0-9a-f]{64}$'
     or p_max_requests is null or p_max_requests not between 1 and 10000
     or p_window_seconds is null or p_window_seconds not between 1 and 86400 then
    raise exception 'invalid rate limit arguments';
  end if;

  -- Bounded cleanup; row locks prevent cleanup racing a request on the same bucket.
  with expired as (
    select b.scope, b.subject_hash
    from public.rate_limit_buckets b
    where b.reset_at <= pg_catalog.clock_timestamp()
    order by b.reset_at
    limit 100
    for update skip locked
  )
  delete from public.rate_limit_buckets b using expired e
  where b.scope = e.scope and b.subject_hash = e.subject_hash;

  v_now := pg_catalog.clock_timestamp();
  insert into public.rate_limit_buckets (scope, subject_hash, request_count, reset_at)
  values (
    p_scope,
    p_subject_hash,
    1,
    v_now + pg_catalog.make_interval(secs => p_window_seconds)
  )
  on conflict (scope, subject_hash) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    v_count := 1;
    v_reset_at := v_now + pg_catalog.make_interval(secs => p_window_seconds);
  else
    -- Serialize requests for this bucket, then evaluate expiration after lock acquisition.
    select b.request_count, b.reset_at
    into v_count, v_reset_at
    from public.rate_limit_buckets b
    where b.scope = p_scope and b.subject_hash = p_subject_hash
    for update;

    v_now := pg_catalog.clock_timestamp();
    if v_reset_at <= v_now then
      v_count := 1;
      v_reset_at := v_now + pg_catalog.make_interval(secs => p_window_seconds);
    else
      v_count := v_count + 1;
    end if;

    update public.rate_limit_buckets b
    set request_count = v_count, reset_at = v_reset_at
    where b.scope = p_scope and b.subject_hash = p_subject_hash;
  end if;

  is_allowed := v_count <= p_max_requests;
  remaining_count := greatest(0, p_max_requests - v_count);
  retry_after_seconds := greatest(
    1,
    ceil(extract(epoch from (v_reset_at - pg_catalog.clock_timestamp())))::integer
  );
  window_resets_at := v_reset_at;
  return next;
end;
$$;

revoke all on function public.insert_contact_message(text, text, text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.list_contact_messages() from public, anon, authenticated, service_role;
revoke all on function public.toggle_contact_message(text) from public, anon, authenticated, service_role;
revoke all on function public.delete_contact_message(text) from public, anon, authenticated, service_role;
revoke all on function public.cleanup_expired_admin_sessions(integer) from public, anon, authenticated, service_role;
revoke all on function public.create_admin_session(text, text, integer) from public, anon, authenticated, service_role;
revoke all on function public.validate_admin_session(text) from public, anon, authenticated, service_role;
revoke all on function public.revoke_admin_session(text) from public, anon, authenticated, service_role;
revoke all on function public.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated, service_role;

grant execute on function public.insert_contact_message(text, text, text, text, text) to service_role;
grant execute on function public.list_contact_messages() to service_role;
grant execute on function public.toggle_contact_message(text) to service_role;
grant execute on function public.delete_contact_message(text) to service_role;
grant execute on function public.cleanup_expired_admin_sessions(integer) to service_role;
grant execute on function public.create_admin_session(text, text, integer) to service_role;
grant execute on function public.validate_admin_session(text) to service_role;
grant execute on function public.revoke_admin_session(text) to service_role;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;

commit;
