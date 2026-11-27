-- Read-only post-migration checks. These queries reveal counts and metadata
-- only: no contact message content, session hashes, or rate-limit subjects.

select c.relname as table_name, c.relrowsecurity as row_security
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'portfolio_profile', 'portfolio_skills', 'portfolio_education',
    'portfolio_experience', 'portfolio_projects', 'portfolio_certificates',
    'contact_messages', 'admin_sessions', 'rate_limit_buckets'
  )
order by c.relname;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename in (
    'portfolio_profile', 'portfolio_skills', 'portfolio_education',
    'portfolio_experience', 'portfolio_projects', 'portfolio_certificates',
    'contact_messages', 'admin_sessions', 'rate_limit_buckets'
  )
order by tablename, policyname;

select c.relname as table_name,
       has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
       has_table_privilege('anon', c.oid, 'INSERT') as anon_insert,
       has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select,
       has_table_privilege('authenticated', c.oid, 'INSERT') as authenticated_insert,
       has_table_privilege('service_role', c.oid, 'SELECT') as service_role_select
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'portfolio_profile', 'portfolio_skills', 'portfolio_education',
    'portfolio_experience', 'portfolio_projects', 'portfolio_certificates',
    'contact_messages', 'admin_sessions', 'rate_limit_buckets'
  )
order by c.relname;

select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where specific_schema = 'public'
  and routine_name in (
    'get_public_portfolio', 'replace_portfolio_profile', 'replace_portfolio_skills',
    'replace_portfolio_education', 'replace_portfolio_experience',
    'replace_portfolio_projects', 'replace_portfolio_certificates',
    'insert_contact_message', 'list_contact_messages', 'toggle_contact_message',
    'delete_contact_message', 'cleanup_expired_admin_sessions',
    'create_admin_session', 'validate_admin_session', 'revoke_admin_session',
    'consume_rate_limit', 'import_portfolio_json'
  )
order by routine_name, grantee;

select p.proname as function_name,
       pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       p.proconfig as function_settings,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'get_public_portfolio', 'replace_portfolio_profile', 'replace_portfolio_skills',
    'replace_portfolio_education', 'replace_portfolio_experience',
    'replace_portfolio_projects', 'replace_portfolio_certificates',
    'insert_contact_message', 'list_contact_messages', 'toggle_contact_message',
    'delete_contact_message', 'cleanup_expired_admin_sessions',
    'create_admin_session', 'validate_admin_session', 'revoke_admin_session',
    'consume_rate_limit', 'import_portfolio_json'
  )
order by p.proname, arguments;

select 'portfolio_profile' as table_name, count(*)::bigint as row_count from public.portfolio_profile
union all select 'portfolio_skills', count(*) from public.portfolio_skills
union all select 'portfolio_education', count(*) from public.portfolio_education
union all select 'portfolio_experience', count(*) from public.portfolio_experience
union all select 'portfolio_projects', count(*) from public.portfolio_projects
union all select 'portfolio_certificates', count(*) from public.portfolio_certificates
union all select 'contact_messages', count(*) from public.contact_messages
union all select 'admin_sessions', count(*) from public.admin_sessions
union all select 'rate_limit_buckets', count(*) from public.rate_limit_buckets
order by table_name;

select jsonb_object_keys(public.get_public_portfolio()) as public_response_key
order by public_response_key;
