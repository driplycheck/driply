-- Загрузка идёт только по подписанным ссылкам: quick-handler проверяет initData и выдаёт токен.
-- Пока эта политика жила, любой с публичным ключом мог лить что угодно в бакет напрямую.
-- Откат, если что-то сломается:
--   create policy "upload outfits" on storage.objects for insert to anon, authenticated
--     with check (bucket_id = 'outfits');
drop policy if exists "upload outfits" on storage.objects;
