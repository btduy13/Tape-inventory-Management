-- verify-production.sql
-- Read-only security checks for the production database. Run as `postgres` after every deploy
-- (and after production-post-deploy.sql). It changes nothing: one SELECT, no DDL, no DML.
--
--   psql "postgresql://postgres.<project-ref>@<pooler-host>:5432/postgres?sslmode=require" \
--        -f supabase/scripts/verify-production.sql
--
-- Output: one row per check with status PASS or FAIL and the offending objects in `detail`.
-- Any FAIL needs action. The allow-lists below describe the intended state of migrations
-- 0001-0018; update them together with the migrations.

\set ON_ERROR_STOP 1
begin transaction read only;
set local search_path = public, pg_catalog;
-- (electron_app's password cannot be checked here: pg_roles masks it. Set it with
--  \password electron_app, see production-post-deploy.sql.)

with
-- Intended exposure ---------------------------------------------------------------------------
anon_policy_allow(tbl, policy) as (
  values ('tape_presets', 'tape_presets_select_active'),         -- public designer reads presets
         ('tape_widths', 'tape_widths_select_active'),           -- 0022: designer width list
         ('tape_spec_settings', 'tape_spec_settings_select')     -- 0022: length range
),
anon_function_allow(sig) as (
  values ('lead_transition_allowed(lead_status,lead_status)')   -- pure, not SECURITY DEFINER
),
electron_table_allow(tbl) as (
  values ('bang_keo_orders'), ('bang_keo_in_orders'), ('truc_in_orders'),
         ('order_attachments'), ('email_history')
),
legacy_tables(tbl) as (
  values ('bang_keo_orders'), ('bang_keo_in_orders'), ('truc_in_orders'),
         ('order_attachments'), ('email_history'), ('app_schema_meta')
),
pub_tables as (
  select c.oid, c.relname, c.relrowsecurity
  from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
),
pub_functions as (
  select p.oid, p.proname,
         p.oid::regprocedure::text as sig,
         p.prosecdef, p.proconfig, p.proacl, p.prokind,
         p.prorettype = 'trigger'::regtype or p.prorettype = 'event_trigger'::regtype as is_trigger
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and not exists (select 1 from pg_depend d
                    where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
),
ea as (select oid from pg_roles where rolname = 'electron_app'),
checks(check_name, failing) as (
  -- RLS -------------------------------------------------------------------------------------
  select 'rls_enabled_on_every_public_table',
         (select string_agg(relname, ', ' order by relname) from pub_tables where not relrowsecurity)
  union all
  -- anon ------------------------------------------------------------------------------------
  select 'anon_policies_only_on_allow_list',
         (select string_agg(format('%s.%s', tablename, policyname), ', ' order by tablename, policyname)
            from pg_policies
           where schemaname = 'public' and permissive = 'PERMISSIVE'
             and ('anon' = any(roles) or 'public' = any(roles))
             and (tablename, policyname) not in (select tbl, policy from anon_policy_allow))
  union all
  select 'anon_no_grants_on_legacy_tables',
         (select string_agg(t.tbl, ', ' order by t.tbl)
            from legacy_tables t
           where to_regclass('public.' || quote_ident(t.tbl)) is not null
             and (has_table_privilege('anon', 'public.' || quote_ident(t.tbl), 'SELECT,INSERT,UPDATE,DELETE')
               or has_table_privilege('authenticated', 'public.' || quote_ident(t.tbl), 'SELECT,INSERT,UPDATE,DELETE')))
  union all
  select 'anon_tables_without_policy_are_rls_protected',
         -- anon keeps Supabase's default table grants; RLS with no anon policy is what denies it.
         (select string_agg(relname, ', ' order by relname) from pub_tables t
           where has_table_privilege('anon', t.oid, 'SELECT,INSERT,UPDATE,DELETE')
             and not t.relrowsecurity)
  union all
  select 'anon_execute_only_on_allow_list',
         (select string_agg(sig, ', ' order by sig) from pub_functions f
           where has_function_privilege('anon', f.oid, 'EXECUTE')
             and f.sig not in (select sig from anon_function_allow))
  union all
  -- functions -------------------------------------------------------------------------------
  select 'security_definer_functions_have_fixed_search_path',
         (select string_agg(sig, ', ' order by sig) from pub_functions
           where prosecdef
             and not exists (select 1 from unnest(coalesce(proconfig, '{}')) c where c like 'search_path=%'))
  union all
  select 'all_public_functions_have_fixed_search_path',
         (select string_agg(sig, ', ' order by sig) from pub_functions
           where not exists (select 1 from unnest(coalesce(proconfig, '{}')) c where c like 'search_path=%'))
  union all
  select 'no_public_execute_on_internal_functions',
         -- PUBLIC execute = NULL ACL (default) or an explicit grant to PUBLIC (grantee 0).
         (select string_agg(sig, ', ' order by sig) from pub_functions f
           where (f.proacl is null
                  or exists (select 1 from aclexplode(f.proacl) a
                              where a.grantee = 0 and a.privilege_type = 'EXECUTE'))
             and f.sig not in (select sig from anon_function_allow))
  union all
  select 'trigger_functions_not_executable_by_api_roles',
         (select string_agg(sig, ', ' order by sig) from pub_functions f
           where f.is_trigger
             and (has_function_privilege('anon', f.oid, 'EXECUTE')
               or has_function_privilege('authenticated', f.oid, 'EXECUTE')))
  union all
  -- electron_app ----------------------------------------------------------------------------
  select 'electron_app_exists_with_no_role_attributes',
         (select coalesce(
            (select case when rolsuper or rolcreaterole or rolcreatedb or rolreplication or rolbypassrls
                         then 'has elevated attributes' end
               from pg_roles where rolname = 'electron_app'),
            case when not exists (select 1 from ea) then 'role missing' end))
  union all
  select 'electron_app_member_of_no_role',
         (select string_agg(r.rolname, ', ' order by r.rolname) from pg_roles r, ea
           where r.oid <> ea.oid and pg_has_role(ea.oid, r.oid, 'MEMBER'))
  union all
  select 'electron_app_tables_only_on_allow_list',
         (select string_agg(format('%s.%s', n.nspname, c.relname), ', ' order by n.nspname, c.relname)
            from pg_class c join pg_namespace n on n.oid = c.relnamespace, ea
           where c.relkind in ('r', 'p', 'v', 'm', 'f')
             and n.nspname not in ('pg_catalog', 'information_schema')
             and has_schema_privilege(ea.oid, n.oid, 'USAGE')
             and has_table_privilege(ea.oid, c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
             and not (n.nspname = 'public' and c.relname in (select tbl from electron_table_allow)))
  union all
  select 'electron_app_no_truncate_references_trigger',
         (select string_agg(c.relname, ', ' order by c.relname)
            from pg_class c, ea
           where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
             and has_table_privilege(ea.oid, c.oid, 'TRUNCATE,REFERENCES,TRIGGER'))
  union all
  select 'electron_app_no_create_on_any_schema',
         (select string_agg(n.nspname, ', ' order by n.nspname) from pg_namespace n, ea
           where has_schema_privilege(ea.oid, n.oid, 'CREATE'))
  union all
  select 'electron_app_no_create_or_temp_on_any_database',
         (select string_agg(d.datname, ', ' order by d.datname) from pg_database d, ea
           where d.datallowconn
             and (has_database_privilege(ea.oid, d.oid, 'CREATE')
               or has_database_privilege(ea.oid, d.oid, 'TEMP')))
  union all
  select 'electron_app_connects_only_to_postgres',
         (select string_agg(d.datname, ', ' order by d.datname) from pg_database d, ea
           where d.datallowconn and not d.datistemplate and d.datname <> current_database()
             and pg_has_role(current_user, d.datdba, 'MEMBER')
             and has_database_privilege(ea.oid, d.oid, 'CONNECT'))
  union all
  select 'electron_app_executes_no_public_function',
         (select string_agg(sig, ', ' order by sig) from pub_functions f, ea
           where has_function_privilege(ea.oid, f.oid, 'EXECUTE')
             and f.sig not in (select sig from anon_function_allow))
  union all
  select 'electron_app_ddl_guard_trigger_enabled',
         (select case
                   when not exists (select 1 from pg_event_trigger where evtname = 'electron_app_ddl_guard')
                     then 'trigger missing'
                   when (select evtenabled from pg_event_trigger where evtname = 'electron_app_ddl_guard') <> 'A'
                     then 'trigger not ENABLE ALWAYS'
                 end)
  union all
  select 'electron_app_pgaudit_ddl',
         (select case when not exists (
                   select 1 from pg_db_role_setting s, unnest(s.setconfig) c, ea
                    where s.setrole = ea.oid and s.setdatabase = 0 and c like 'pgaudit.log=%ddl%')
                 then 'pgaudit.log for electron_app does not include ddl' end)
  union all
  select 'no_login_event_triggers',
         (select string_agg(evtname, ', ' order by evtname) from pg_event_trigger where evtevent = 'login')
  union all
  select 'no_extensions_owned_by_unexpected_roles',
         -- After L1: an extension installed through supautils by electron_app is owned by
         -- supabase_admin like every platform extension, so also review this list by hand.
         (select string_agg(format('%s (%s)', extname, extowner::regrole), ', ' order by extname)
            from pg_extension
           where extowner::regrole::text not in ('supabase_admin', 'postgres'))
  union all
  select 'storage_vectors_locked_down',
         (select string_agg(x, ', ') from (
            select 'PUBLIC TEMP' as x from pg_database d, aclexplode(coalesce(d.datacl, acldefault('d', d.datdba))) a
             where d.datname = 'storage_vectors' and a.grantee = 0 and a.privilege_type = 'TEMPORARY'
            union all
            select 'PUBLIC CONNECT' from pg_database d, aclexplode(coalesce(d.datacl, acldefault('d', d.datdba))) a
             where d.datname = 'storage_vectors' and a.grantee = 0 and a.privilege_type = 'CONNECT'
            union all
            select 'electron_app CONNECT' from pg_database d, ea
             where d.datname = 'storage_vectors' and has_database_privilege(ea.oid, d.oid, 'CONNECT')) s)
)
select check_name,
       case when failing is null then 'PASS' else 'FAIL' end as status,
       coalesce(failing, '') as detail
from checks
union all
select 'installed_extensions (review by hand)', 'INFO',
       (select string_agg(format('%s %s in %s', extname, extversion, extnamespace::regnamespace), ', '
                          order by extname) from pg_extension)
union all
select 'electron_app_large_objects', case when count(*) = 0 then 'PASS' else 'FAIL' end,
       case when count(*) = 0 then '' else count(*)::text || ' objects: run public.electron_app_purge_large_objects()' end
from pg_largeobject_metadata m join pg_roles r on r.oid = m.lomowner and r.rolname = 'electron_app';

rollback;
