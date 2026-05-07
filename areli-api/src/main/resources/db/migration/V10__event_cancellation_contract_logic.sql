alter table events
    add column if not exists cancellation_type varchar(50),
    add column if not exists cancellation_requested_at date,
    add column if not exists cancellation_notice_days int,
    add column if not exists retained_advance_amount numeric(12,2) not null default 0,
    add column if not exists cancellation_notes text;
