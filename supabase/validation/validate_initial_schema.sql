-- Read-only validation for the new project's target schema.
-- These queries intentionally do not return note text, exercises, tags,
-- email addresses, UUID values, or individual dates.

select
  columns.table_name,
  columns.column_name,
  columns.data_type,
  columns.is_nullable,
  columns.column_default
from information_schema.columns
where columns.table_schema = 'public'
  and columns.table_name in ('users', 'notes', 'user_tags')
order by columns.table_name, columns.ordinal_position;

select
  constraints.table_name,
  constraints.constraint_name,
  constraints.constraint_type,
  pg_get_constraintdef(pg_constraint.oid) as definition
from information_schema.table_constraints as constraints
join pg_namespace on pg_namespace.nspname = constraints.table_schema
join pg_class on pg_class.relnamespace = pg_namespace.oid
  and pg_class.relname = constraints.table_name
join pg_constraint on pg_constraint.conrelid = pg_class.oid
  and pg_constraint.conname = constraints.constraint_name
where constraints.table_schema = 'public'
  and constraints.table_name in ('users', 'notes', 'user_tags')
order by constraints.table_name, constraints.constraint_name;

select
  pg_class.relname as index_name,
  pg_index.indisunique as is_unique,
  pg_get_indexdef(pg_index.indexrelid) as definition
from pg_index
join pg_class on pg_class.oid = pg_index.indexrelid
join pg_class as indexed_table on indexed_table.oid = pg_index.indrelid
join pg_namespace on pg_namespace.oid = indexed_table.relnamespace
where pg_namespace.nspname = 'public'
  and indexed_table.relname = 'notes'
order by pg_class.relname;

select
  pg_class.relname as table_name,
  pg_class.relrowsecurity as rls_enabled,
  pg_class.relforcerowsecurity as force_rls
from pg_class
join pg_namespace on pg_namespace.oid = pg_class.relnamespace
where pg_namespace.nspname = 'public'
  and pg_class.relname in ('users', 'notes', 'user_tags')
order by pg_class.relname;

select
  policies.tablename,
  policies.policyname,
  policies.cmd,
  policies.roles,
  policies.qual,
  policies.with_check
from pg_policies as policies
where policies.schemaname = 'public'
  and policies.tablename in ('users', 'notes', 'user_tags')
order by policies.tablename, policies.policyname;

with table_names(table_name) as (
  values ('users'), ('notes'), ('user_tags')
), roles(role_name) as (
  values ('anon'), ('authenticated'), ('service_role')
)
select
  table_names.table_name,
  roles.role_name,
  has_table_privilege(roles.role_name, format('public.%I', table_names.table_name), 'select') as can_select,
  has_table_privilege(roles.role_name, format('public.%I', table_names.table_name), 'insert') as can_insert,
  has_table_privilege(roles.role_name, format('public.%I', table_names.table_name), 'update') as can_update,
  has_table_privilege(roles.role_name, format('public.%I', table_names.table_name), 'delete') as can_delete,
  has_table_privilege(roles.role_name, format('public.%I', table_names.table_name), 'truncate') as can_truncate,
  has_table_privilege(roles.role_name, format('public.%I', table_names.table_name), 'references') as can_references,
  has_table_privilege(roles.role_name, format('public.%I', table_names.table_name), 'trigger') as can_trigger
from table_names
cross join roles
order by table_names.table_name, roles.role_name;

-- Expected: anon/authenticated are false for all three columns; service_role
-- is true only for usage and select, and false for update.
with roles(role_name) as (
  values ('anon'), ('authenticated'), ('service_role')
)
select
  roles.role_name,
  has_sequence_privilege(roles.role_name, 'public.user_tags_id_seq', 'usage') as can_use,
  has_sequence_privilege(roles.role_name, 'public.user_tags_id_seq', 'select') as can_select,
  has_sequence_privilege(roles.role_name, 'public.user_tags_id_seq', 'update') as can_update
from roles
order by roles.role_name;

select
  pg_get_function_identity_arguments(pg_proc.oid) as arguments,
  pg_proc.prosecdef as is_security_definer,
  coalesce((
    select setting = 'search_path='
    from unnest(coalesce(pg_proc.proconfig, array[]::text[])) as setting
    where setting like 'search_path=%'
  ), false) as has_empty_search_path,
  not exists (
    select 1
    from aclexplode(coalesce(pg_proc.proacl, acldefault('f', pg_proc.proowner))) as privilege
    where privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  ) as public_execute_revoked,
  has_function_privilege('service_role', pg_proc.oid, 'execute') as service_role_can_execute,
  has_function_privilege('anon', pg_proc.oid, 'execute') as anon_can_execute,
  has_function_privilege('authenticated', pg_proc.oid, 'execute') as authenticated_can_execute
from pg_proc
join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
where pg_namespace.nspname = 'public'
  and pg_proc.proname = 'remove_tag_from_notes';

select
  count(*) as notes_total,
  count(*) filter (where userid is null) as notes_with_null_userid
from public.notes;

select count(*) as duplicate_user_date_groups
from (
  select 1
  from public.notes
  group by userid, date
  having count(*) > 1
) as duplicate_user_dates;

select
  count(*) as user_tags_total,
  count(*) filter (where user_id is null) as user_tags_with_null_user_id
from public.user_tags;
