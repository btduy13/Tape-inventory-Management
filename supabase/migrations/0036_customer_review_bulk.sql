-- 0036_customer_review_bulk
-- Make the customer backfill review queue (0028) fast to finish: one admin decision for many name
-- groups, undoable per batch. Nothing here creates a customer by itself: every customer comes from an
-- admin call. Tests: supabase/tests/rls/26_customer_review_bulk.test.sql
--
-- 1. normalize_customer_name (exact key, groups the queue): accents removed (NFD + strip marks, đ -> d;
--    no unaccent extension needed, locale-independent), lower case, punctuation -> space, spaces
--    collapsed. Legal-form words are CANONICALIZED, not removed: "Công ty" / "Cty" is dropped (it says
--    nothing about which company), "cổ phần" -> cp, "trách nhiệm hữu hạn" -> tnhh, "một thành viên" /
--    "1tv" -> mtv. So "Cty TNHH Minh Phát" = "CÔNG TY TNHH MINH PHÁT" = "tnhh minh phat", but
--    "Cty CP Minh Phát" = "cp minh phat" stays a different group (may be another legal entity).
--    Titles (Anh, Chị, A., C., Cô, Chú...) are KEPT: "Chị Lan" and "Lan" stay apart.
--    The pending queue rows are re-keyed with the new function; the name index is rebuilt.
-- 2. customer_name_loose_key: the exact key without legal-form words (tnhh, mtv, cp, tm, dv, sx...) and
--    without a leading title. Never groups anything: it only finds "similar names" for the admin
--    (pg_trgm is not installed in this project, so no trigram similarity).
-- 3. admin_customer_review_list: + members (every row of the group with its total), similar_groups (other
--    groups with the same loose key), total_rows; suggested customers also match on the loose key.
-- 4. admin_customer_review_regroup: moves one group's pending rows into another group (two spellings,
--    one customer). A later customer_backfill_dry_run() rebuilds the groups (pending rows only).
-- 5. admin_customer_review_bulk_create(p_rows): one new customer per picked group (most frequent
--    spelling, newest phone / address), linked through admin_customer_review_resolve, logged in
--    customer_backfill_log with one batch_id. Idempotent: rows no longer pending are skipped.
-- 6. admin_customer_review_bulk_undo(p_batch): unlinks the batch's rows (only where the order still
--    points at the batch customer), puts them back in the queue, deletes the batch's customers that
--    have nothing linked any more, drops the batch's log rows (a second undo does nothing).

-- ---------------------------------------------------------------------------
-- 1. Name keys
-- ---------------------------------------------------------------------------
create or replace function public.normalize_customer_name(p_name text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v     text;
  v_in  text;
  v_raw text;
begin
  -- Strip accents before lower(): lower() of non-ASCII letters depends on the database locale.
  v := translate(regexp_replace(normalize(coalesce(p_name, ''), NFD), '[̀-ͯ]', '', 'g'), 'đĐ', 'dD');
  -- A name with no a-z/0-9 left (another script) keeps its lowercased text, as before 0036.
  v_raw := nullif(btrim(regexp_replace(lower(v), '\s+', ' ', 'g')), '');
  v := btrim(regexp_replace(lower(v), '[^a-z0-9]+', ' ', 'g'));
  v_in := coalesce(nullif(v, ''), v_raw);
  v := regexp_replace(v, '\mtrach nhiem huu han\M', 'tnhh', 'g');
  v := regexp_replace(v, '\mco phan\M', 'cp', 'g');
  v := regexp_replace(v, '\m(mot thanh vien|1 thanh vien|1tv|1 tv)\M', 'mtv', 'g');
  v := regexp_replace(v, '\m(cong ty|cty)\M', ' ', 'g');
  v := btrim(regexp_replace(v, '\s+', ' ', 'g'));
  return nullif(case when v = '' then v_in else v end, '');
end;
$$;

create or replace function public.customer_name_loose_key(p_name text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_key text := public.normalize_customer_name(p_name);
  v     text;
begin
  v := regexp_replace(coalesce(v_key, ''),
         '\m(tnhh|mtv|cp|jsc|ltd|co ltd|dntn|doanh nghiep tu nhan|hkd|ho kinh doanh|tm|thuong mai|dv|dich vu'
         '|sx|san xuat|xnk|xuat nhap khau)\M', ' ', 'g');
  -- "ba" is not in the list: it is also a common given name (Chị Ba).
  v := regexp_replace(btrim(regexp_replace(v, '\s+', ' ', 'g')), '^(anh|chi|a|c|co|chu|ong|em|bac|cu) ', '');
  return nullif(coalesce(nullif(v, ''), v_key), '');
end;
$$;

reindex index public.customers_name_norm_idx;

-- Pending queue rows keep their 0028 shape, keyed by the new name function.
update public.customer_match_candidates m
   set name_norm = public.normalize_customer_name(m.ten_khach_hang),
       group_key = case when m.group_key like 'name:%'
                        then 'name:' || public.normalize_customer_name(m.ten_khach_hang) else m.group_key end
 where m.status = 'pending';

alter table public.customer_backfill_log add column if not exists batch_id uuid;
create index if not exists customer_backfill_log_batch_idx
  on public.customer_backfill_log (batch_id) where batch_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Review list with members and similar groups
-- ---------------------------------------------------------------------------
-- Sale total of one unlinked order row (formula of customer_order_rows, 0028). Null for a lead.
-- shortcut: duplicates the customer_order_rows money formula; move both to one function if it changes.
create or replace function public.customer_review_row_total(p_table text, p_id text)
returns numeric
language sql
stable
set search_path = ''
as $$
  select case p_table
    when 'bang_keo_in_orders' then
      (select (coalesce(b.thanh_tien_ban, 0) + coalesce(b.vat, 0)
               + case when b.loai_truc = 'moi' then coalesce(b.truc_thanh_tien_ban, 0) + coalesce(b.truc_vat, 0) else 0 end)::numeric
         from public.bang_keo_in_orders b where b.id::text = p_id)
    when 'bang_keo_orders' then
      (select (coalesce(b.thanh_tien_ban, 0) + coalesce(b.vat, 0))::numeric from public.bang_keo_orders b where b.id::text = p_id)
    when 'truc_in_orders' then
      (select (coalesce(t.thanh_tien_ban, 0) + coalesce(t.vat, 0))::numeric from public.truc_in_orders t where t.id::text = p_id)
    when 'thank_you_orders' then
      (select (coalesce(y.thanh_tien_ban, 0) + coalesce(y.vat, 0))::numeric from public.thank_you_orders y where y.id = p_id)
  end
$$;

-- 0028 columns unchanged; new: members [{source_table, order_type, source_id, thoi_gian, ten_khach_hang,
-- sdt_khach_hang, tong_tien}] newest first, similar_groups [{source_table, source_id, ten_khach_hang,
-- group_size}] (other groups, same loose key), total_rows (rows in every pending group).
drop function if exists public.admin_customer_review_list(integer, integer);
create function public.admin_customer_review_list(p_limit integer default 50, p_offset integer default 0)
returns table (
  source_table       text,
  order_type         text,
  source_id          text,
  ten_khach_hang     text,
  sdt_khach_hang     text,
  dia_chi_khach_hang text,
  thoi_gian          timestamp,
  reason             text,
  suggestions        jsonb,
  group_size         integer,
  group_ids          text[],
  total_count        bigint,
  members            jsonb,
  similar_groups     jsonb,
  total_rows         bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  -- One item per group_key (rows without one stand alone), shown by its newest row.
  return query
    with q as (
      select m.*, coalesce(m.group_key, m.source_table || ':' || m.source_id) as gk
        from public.customer_match_candidates m
       where m.decision = 'review' and m.status = 'pending'
    ), r as (
      select q.*,
             row_number() over (partition by q.gk order by q.thoi_gian desc nulls last, q.source_id desc) as rn,
             count(*) over (partition by q.gk) as gsize,
             array_agg(q.source_id) over (partition by q.gk order by q.thoi_gian nulls last, q.source_id
                                          rows between unbounded preceding and unbounded following) as gids
        from q
    ), g as (
      select r.*, public.customer_name_loose_key(r.ten_khach_hang) as lk from r where r.rn = 1
    ), ck as materialized (
      -- Both keys once per customer, not once per customer per group.
      select cu.id, cu.name, cu.phone, cu.company, cu.address, cu.phone_norm, cu.updated_at,
             public.normalize_customer_name(cu.name) as nk, public.customer_name_loose_key(cu.name) as lk
        from public.customers cu
    )
    select m.source_table,
           case m.source_table when 'leads' then 'lead' else replace(m.source_table, '_orders', '') end,
           m.source_id, m.ten_khach_hang, m.sdt_khach_hang, m.dia_chi_khach_hang, m.thoi_gian, m.reason,
           coalesce((
             select jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name, 'phone', x.phone,
                                                 'company', x.company, 'address', x.address))
               from (select cu.* from ck cu
                      where (m.phone_norm is not null and cu.phone_norm = m.phone_norm)
                         or (m.name_norm is not null and cu.nk = m.name_norm)
                         or (m.lk is not null and cu.lk = m.lk)
                      order by (cu.nk = m.name_norm) desc nulls last, cu.updated_at desc
                      limit 5) x), '[]'::jsonb),
           m.gsize::integer, m.gids,
           count(*) over (),
           (select jsonb_agg(jsonb_build_object(
                     'source_table', x.source_table,
                     'order_type', case x.source_table when 'leads' then 'lead' else replace(x.source_table, '_orders', '') end,
                     'source_id', x.source_id, 'thoi_gian', x.thoi_gian, 'ten_khach_hang', x.ten_khach_hang,
                     'sdt_khach_hang', x.sdt_khach_hang,
                     'tong_tien', public.customer_review_row_total(x.source_table, x.source_id))
                     order by x.thoi_gian desc nulls last, x.source_id desc)
              from q x where x.gk = m.gk),
           coalesce((
             select jsonb_agg(jsonb_build_object('source_table', o.source_table, 'source_id', o.source_id,
                                                 'ten_khach_hang', o.ten_khach_hang, 'group_size', o.gsize)
                              order by o.gsize desc, o.source_id)
               from g o where o.lk = m.lk and o.gk <> m.gk), '[]'::jsonb),
           (sum(m.gsize) over ())::bigint
      from g m
     order by m.gsize desc, m.thoi_gian nulls last, m.source_table, m.source_id
     limit least(greatest(coalesce(p_limit, 50), 1), 200)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Regroup (two spellings -> one group)
-- ---------------------------------------------------------------------------
-- Every pending review row of the source row's group joins the target row's group. Returns the
-- number of rows moved. Either row not pending review -> P0002; same group -> 22023.
create or replace function public.admin_customer_review_regroup(p_source_table text, p_source_id text,
                                                                p_target_table text, p_target_id text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s   public.customer_match_candidates;
  v_t   public.customer_match_candidates;
  v_key text;
  v_n   integer;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select m.* into v_s from public.customer_match_candidates m
   where m.source_table = p_source_table and m.source_id = p_source_id and m.decision = 'review' and m.status = 'pending'
   for update;
  select m.* into v_t from public.customer_match_candidates m
   where m.source_table = p_target_table and m.source_id = p_target_id and m.decision = 'review' and m.status = 'pending'
   for update;
  if v_s.source_table is null or v_t.source_table is null then
    raise exception 'review row not found' using errcode = 'P0002';
  end if;
  v_key := coalesce(v_t.group_key, 'row:' || v_t.source_table || ':' || v_t.source_id);
  if v_key = coalesce(v_s.group_key, 'row:' || v_s.source_table || ':' || v_s.source_id) then
    raise exception 'same group' using errcode = '22023';
  end if;
  update public.customer_match_candidates m set group_key = v_key
   where m.source_table = v_t.source_table and m.source_id = v_t.source_id and m.group_key is null;
  update public.customer_match_candidates m set group_key = v_key
   where m.decision = 'review' and m.status = 'pending'
     and ((m.source_table = v_s.source_table and m.source_id = v_s.source_id)
          or (v_s.group_key is not null and m.group_key = v_s.group_key));
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Bulk create + undo
-- ---------------------------------------------------------------------------
-- p_rows: 'source_table:source_id' of any row of each picked group (max 500). Per group: a new customer
-- (name = most frequent spelling, newest first on a tie; phone / address = newest non-empty), then
-- admin_customer_review_resolve links the group (same checks as one decision). A group whose picked
-- row changed since the dry run is skipped (its customer is rolled back), so are rows no longer
-- pending and groups without a name. Returns {batch_id (null when nothing was created),
-- customers_created, rows_linked, skipped}.
create or replace function public.admin_customer_review_bulk_create(p_rows text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch   uuid := gen_random_uuid();
  k         text;
  v_t       text;
  v_id      text;
  v_m       public.customer_match_candidates;
  v_name    text;
  v_phone   text;
  v_addr    text;
  v_cid     uuid;
  v_n       integer;
  v_created integer := 0;
  v_linked  integer := 0;
  v_skipped integer := 0;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if p_rows is null or cardinality(p_rows) > 500 then
    raise exception 'p_rows: 1-500 rows' using errcode = '22023';
  end if;
  foreach k in array p_rows loop
    v_t := split_part(k, ':', 1);
    v_id := substr(k, char_length(v_t) + 2);
    v_m := null;
    select m.* into v_m from public.customer_match_candidates m
     where m.source_table = v_t and m.source_id = v_id and m.decision = 'review' and m.status = 'pending';
    -- Only "same name, no phone" groups: any other reason means a customer may already exist
    -- (name / phone match), so those stay one-by-one decisions.
    if v_m.source_table is null or exists (
         select 1 from public.customer_match_candidates m
          where m.decision = 'review' and m.status = 'pending'
            and ((m.source_table = v_m.source_table and m.source_id = v_m.source_id)
                 or (v_m.group_key is not null and m.group_key = v_m.group_key))
            and m.reason is distinct from 'same name, no phone') then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    with grp as (
      select m.* from public.customer_match_candidates m
       where m.decision = 'review' and m.status = 'pending'
         and ((m.source_table = v_m.source_table and m.source_id = v_m.source_id)
              or (v_m.group_key is not null and m.group_key = v_m.group_key))
    )
    select (select regexp_replace(btrim(g.ten_khach_hang), '\s+', ' ', 'g') from grp g
             where nullif(btrim(g.ten_khach_hang), '') is not null
             group by 1 order by count(*) desc, max(g.thoi_gian) desc nulls last, 1 limit 1),
           (select btrim(g.sdt_khach_hang) from grp g
             where nullif(btrim(g.sdt_khach_hang), '') is not null and char_length(btrim(g.sdt_khach_hang)) <= 30
             order by g.thoi_gian desc nulls last, g.source_id desc limit 1),
           (select left(btrim(g.dia_chi_khach_hang), 500) from grp g
             where nullif(btrim(g.dia_chi_khach_hang), '') is not null
             order by g.thoi_gian desc nulls last, g.source_id desc limit 1)
      into v_name, v_phone, v_addr;
    if v_name is null then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    begin
      insert into public.customers (name, phone, address) values (left(v_name, 255), v_phone, v_addr)
      returning id into v_cid;
      perform public.admin_customer_review_resolve(v_m.source_table, v_m.source_id, v_cid);
      -- v_cid is new: every log row with it was written just now by the resolve above.
      update public.customer_backfill_log set batch_id = v_batch, customer_created = true where customer_id = v_cid;
      get diagnostics v_n = row_count;
      v_created := v_created + 1;
      v_linked := v_linked + v_n;
    exception when sqlstate 'P0002' then
      v_skipped := v_skipped + 1;
    end;
  end loop;
  return jsonb_build_object('batch_id', case when v_created > 0 then v_batch end, 'customers_created', v_created,
                            'rows_linked', v_linked, 'skipped', v_skipped);
end;
$$;

-- Undo one bulk batch. A row is unlinked only while it still points at the customer the batch gave it
-- (a later edit / merge target is followed through the log, admin_customer_merge moves log rows).
-- A customer is deleted only when this batch created it (created_at = the batch's transaction time,
-- so a pre-existing merge target never qualifies) and nothing links to it any more.
-- Returns {rows_unlinked, customers_deleted}.
create or replace function public.admin_customer_review_bulk_undo(p_batch uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  l        record;
  v_n      integer;
  v_rows   integer := 0;
  v_del    integer := 0;
  v_cids   uuid[];
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select array_agg(distinct bl.customer_id) into v_cids
    from public.customer_backfill_log bl
    join public.customers cu on cu.id = bl.customer_id and cu.created_at = bl.applied_at
   where bl.batch_id = p_batch and bl.customer_created;
  for l in
    select * from public.customer_backfill_log where batch_id = p_batch order by id for update
  loop
    -- l.source_table was written by the resolve (check-constrained table list), never raw input.
    execute format('update public.%I set customer_id = null where id::text = $1 and customer_id = $2', l.source_table)
      using l.source_id, l.customer_id;
    get diagnostics v_n = row_count;
    v_rows := v_rows + v_n;
    if v_n > 0 then
      update public.customer_match_candidates
         set status = 'pending', customer_id = null, resolved_by = null, resolved_at = null
       where source_table = l.source_table and source_id = l.source_id and status = 'linked';
    end if;
  end loop;
  delete from public.customer_backfill_log where batch_id = p_batch;
  delete from public.customers cu
   where cu.id = any(coalesce(v_cids, '{}'))
     and cu.updated_at = cu.created_at  -- edited or merged into since: keep it
     and not exists (select 1 from public.bang_keo_in_orders o where o.customer_id = cu.id)
     and not exists (select 1 from public.bang_keo_orders o where o.customer_id = cu.id)
     and not exists (select 1 from public.truc_in_orders o where o.customer_id = cu.id)
     and not exists (select 1 from public.thank_you_orders o where o.customer_id = cu.id)
     and not exists (select 1 from public.leads o where o.customer_id = cu.id)
     and not exists (select 1 from public.customer_backfill_log o where o.customer_id = cu.id);
  get diagnostics v_del = row_count;
  return jsonb_build_object('rows_unlinked', v_rows, 'customers_deleted', v_del);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Privileges
-- ---------------------------------------------------------------------------
revoke all on function public.normalize_customer_name(text) from public, anon, authenticated;
revoke all on function public.customer_name_loose_key(text) from public, anon, authenticated;
revoke all on function public.customer_review_row_total(text, text) from public, anon, authenticated;
revoke all on function public.admin_customer_review_list(integer, integer) from public, anon;
revoke all on function public.admin_customer_review_regroup(text, text, text, text) from public, anon;
revoke all on function public.admin_customer_review_bulk_create(text[]) from public, anon;
revoke all on function public.admin_customer_review_bulk_undo(uuid) from public, anon;
grant execute on function public.admin_customer_review_list(integer, integer) to authenticated;
grant execute on function public.admin_customer_review_regroup(text, text, text, text) to authenticated;
grant execute on function public.admin_customer_review_bulk_create(text[]) to authenticated;
grant execute on function public.admin_customer_review_bulk_undo(uuid) to authenticated;
