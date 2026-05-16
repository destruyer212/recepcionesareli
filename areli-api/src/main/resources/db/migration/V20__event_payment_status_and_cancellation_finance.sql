alter table events
    add column if not exists cancellation_advance_amount numeric(12,2) not null default 0,
    add column if not exists cancellation_retained_amount numeric(12,2) not null default 0,
    add column if not exists cancellation_refunded_amount numeric(12,2) not null default 0,
    add column if not exists cancellation_payment_status varchar(50),
    add column if not exists cancellation_reason text,
    add column if not exists cancellation_date date,
    add column if not exists cancellation_observation text,
    add column if not exists rescheduled boolean not null default false,
    add column if not exists original_event_date date,
    add column if not exists original_start_time time,
    add column if not exists original_end_time time;

alter table client_payments
    add column if not exists payment_type varchar(40) not null default 'EVENT_PAYMENT',
    add column if not exists counts_towards_event_total boolean not null default true;

update client_payments
set payment_type = 'EVENT_PAYMENT',
    counts_towards_event_total = true
where payment_type is null;

update events
set status = 'CONTRACTED'
where status in ('PREPARING', 'COMPLETED', 'CLOSED');

update events
set status = 'SEPARATED',
    rescheduled = true
where status = 'RESCHEDULED';

update events e
set cancellation_payment_status = case
        when coalesce(e.retained_advance_amount, 0) > 0 then 'ADELANTO_RETENIDO'
        else 'SIN_ADELANTO'
    end,
    cancellation_advance_amount = greatest(coalesce(e.retained_advance_amount, 0), 0),
    cancellation_retained_amount = greatest(coalesce(e.retained_advance_amount, 0), 0),
    cancellation_refunded_amount = 0,
    cancellation_date = coalesce(e.cancellation_requested_at, current_date),
    cancellation_reason = e.cancellation_notes,
    cancellation_observation = e.cancellation_notes
where e.status = 'CANCELLED'
  and e.cancellation_payment_status is null;

create index if not exists idx_client_payments_event_type
on client_payments(event_id, payment_type);

create index if not exists idx_events_cancellation_payment_status
on events(cancellation_payment_status);
