-- Расписание напоминаний в боте. Секрет лежит в vault, в репозиторий не попадает:
--   select vault.create_secret('<секрет>', 'digest_secret', '...');
-- Время в UTC: 15:00 = 18:00 МСК, понедельник 06:00 = 09:00 МСК.

create or replace function public.call_digest(p_kind text)
returns bigint language plpgsql security definer set search_path to 'public'
as $$
declare v_secret text; v_id bigint;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'digest_secret';
  if v_secret is null then raise exception 'NO_DIGEST_SECRET'; end if;

  select net.http_post(
    url := 'https://chnvpnbnqvugsbwelmoq.supabase.co/functions/v1/digest',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-digest-secret', v_secret),
    body := jsonb_build_object('kind', p_kind)
  ) into v_id;
  return v_id;
end;
$$;

revoke all on function public.call_digest(text) from public, anon, authenticated;

select cron.unschedule('driply-digest-daily') where exists (select 1 from cron.job where jobname = 'driply-digest-daily');
select cron.unschedule('driply-digest-weekly') where exists (select 1 from cron.job where jobname = 'driply-digest-weekly');

select cron.schedule('driply-digest-daily', '0 15 * * *', $cron$select public.call_digest('daily')$cron$);
select cron.schedule('driply-digest-weekly', '0 6 * * 1', $cron$select public.call_digest('weekly')$cron$);
