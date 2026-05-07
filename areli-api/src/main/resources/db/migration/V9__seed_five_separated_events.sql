alter table events
    add column if not exists contract_capacity_override int;

insert into events (
    id,
    client_id,
    floor_id,
    package_id,
    title,
    event_type,
    event_date,
    start_time,
    end_time,
    status,
    total_amount,
    apdayc_amount,
    contract_capacity_override,
    apdayc_payer,
    apdayc_status,
    apdayc_notes,
    notes,
    created_at,
    updated_at
)
select
    gen_random_uuid(),
    c.id,
    (
        select f.id
        from floors f
        order by f.level_number
        offset ((g.idx - 1) % greatest((select count(*) from floors), 1))
        limit 1
    ),
    (
        select p.id
        from event_packages p
        where p.active = true
        order by p.base_price desc nulls last
        limit 1
    ),
    'Evento separado demo ' || g.idx,
    'Cumpleaños',
    current_date + (g.idx + 2),
    time '18:00',
    time '23:00',
    'SEPARATED',
    coalesce((
        select p.base_price
        from event_packages p
        where p.active = true
        order by p.base_price desc nulls last
        limit 1
    ), 0),
    0,
    coalesce((
        select p.included_capacity
        from event_packages p
        where p.active = true
        order by p.base_price desc nulls last
        limit 1
    ), (
        select f.capacity
        from floors f
        order by f.level_number
        limit 1
    ), 80),
    'CLIENT',
    'PENDING',
    'APDAYC referencial para evento de prueba.',
    'SEED_SEPARATED_EVENTS_V9 #' || g.idx,
    now(),
    now()
from (
    select id
    from clients
    order by created_at
    limit 1
) c
cross join generate_series(1, 5) as g(idx)
where exists (select 1 from floors)
  and not exists (
    select 1
    from events e
    where e.notes like 'SEED_SEPARATED_EVENTS_V9 #%'
);
