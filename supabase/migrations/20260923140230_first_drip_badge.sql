-- Статус «first drip» для первых авторов. Здесь же выдача задним числом.
-- Логика внутри create_post заменена более поздней миграцией (лимит 50), см. 20260923221421.
update users u
set badge = 'first_drip'
where u.badge is null
  and exists (select 1 from posts p where p.user_id = u.id)
  and (select count(distinct user_id) from posts) <= 100;
