update floors
set name = '3er y 4to piso',
    status = 'AVAILABLE',
    description = 'Ambiente combinado de 3er y 4to piso para reservas conjuntas.',
    updated_at = now()
where level_number = 3;

insert into floors (name, level_number, capacity, area_m2, status, description)
select '3er y 4to piso', 3, null, null, 'AVAILABLE', 'Ambiente combinado de 3er y 4to piso para reservas conjuntas.'
where not exists (
    select 1
    from floors
    where level_number = 3
);
