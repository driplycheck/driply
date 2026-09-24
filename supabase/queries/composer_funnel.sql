-- Воронка композера: где люди отваливаются по дороге к первому образу.
-- Вставить в SQL-редактор Supabase. Период меняется в одном месте — в interval ниже.

with e as (
  select * from events
  where kind not like 'rl:%' and created_at > now() - interval '30 days'
)
select step, people, events
from (
  select 1 as ord, 'открыл приложение'        as step, count(distinct tid) as people, count(*) as events from e where kind = 'app_open'
  union all
  select 2, 'открыл композер',                count(distinct tid), count(*) from e where kind = 'composer_opened'
  union all
  select 3, 'нажал способ добавить фото',     count(distinct tid), count(*) from e where kind = 'photo_way'
  union all
  select 4, 'передумал в окне выбора',        count(distinct tid), count(*) from e where kind = 'photo_cancelled'
  union all
  select 5, 'фото добавлено',                 count(distinct tid), count(*) from e where kind = 'photo_added'
  union all
  select 6, 'образ опубликован',              count(distinct tid), count(*) from e where kind = 'post_created'
) t order by ord;

-- С чем уходили из композера: empty — ушёл с пустого экрана, picker — не вернулся из выбора файла,
-- photo — фото есть, но ничего не заполнил, ready — всё готово, но не опубликовал.
select meta->>'stage' as stage,
       count(*) as cases,
       count(distinct tid) as people,
       round(avg((meta->>'sec')::numeric)) as avg_sec
from events
where kind = 'composer_closed' and created_at > now() - interval '30 days'
group by 1 order by cases desc;

-- Камера против галереи и доля отказов по каждому способу.
select w.meta->>'way' as way,
       count(*) as opened,
       (select count(*) from events c
         where c.kind = 'photo_cancelled' and c.meta->>'way' = w.meta->>'way'
           and c.created_at > now() - interval '30 days') as cancelled
from events w
where w.kind = 'photo_way' and w.created_at > now() - interval '30 days'
group by 1 order by opened desc;
