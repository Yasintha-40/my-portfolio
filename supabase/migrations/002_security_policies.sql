-- Client roles receive no direct table access. Backend operations run through
-- narrowly scoped SECURITY DEFINER functions owned by the migration owner.
begin;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'portfolio_profile', 'portfolio_skills', 'portfolio_education',
    'portfolio_experience', 'portfolio_projects', 'portfolio_certificates',
    'contact_messages', 'admin_sessions', 'rate_limit_buckets'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists deny_client_access on public.%I', table_name);
    execute format(
      'create policy deny_client_access on public.%I for all to anon, authenticated using (false) with check (false)',
      table_name
    );
    execute format(
      'revoke all on table public.%I from public, anon, authenticated, service_role',
      table_name
    );
  end loop;
end
$$;

revoke all on sequence public.contact_messages_sort_order_seq
  from public, anon, authenticated, service_role;

-- Public bucket downloads by URL intentionally remain readable. These policies
-- deny browser API listing and all direct browser writes. Backend uploads use
-- the server-only key; create the bucket through Supabase Storage UI/API.
drop policy if exists portfolio_deny_direct_client_storage
  on storage.objects;
create policy portfolio_deny_direct_client_storage
  on storage.objects
  for all to anon, authenticated
  using (false)
  with check (false);

commit;
