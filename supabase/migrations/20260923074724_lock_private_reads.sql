-- Приватные чтения «про себя» принимали telegram_id и были открыты публичному ключу:
-- по чужому id доставались баланс, настройки, реф-код, голоса и блокировки.
-- Теперь их зовёт только quick-handler под service_role, после проверки подписи initData.

revoke all on function public.my_profile(bigint) from public, anon, authenticated;
grant execute on function public.my_profile(bigint) to service_role;

revoke all on function public.my_posts(bigint) from public, anon, authenticated;
grant execute on function public.my_posts(bigint) to service_role;

revoke all on function public.my_votes(bigint) from public, anon, authenticated;
grant execute on function public.my_votes(bigint) to service_role;

revoke all on function public.my_blocks(bigint) from public, anon, authenticated;
grant execute on function public.my_blocks(bigint) to service_role;

revoke all on function public.ref_stats(bigint) from public, anon, authenticated;
grant execute on function public.ref_stats(bigint) to service_role;

revoke all on function public.ref_invited_list(bigint) from public, anon, authenticated;
grant execute on function public.ref_invited_list(bigint) to service_role;
