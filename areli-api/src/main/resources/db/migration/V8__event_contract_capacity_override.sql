alter table events
    add column if not exists contract_capacity_override int;
