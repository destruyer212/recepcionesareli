alter table events
    drop constraint if exists events_time_order;

alter table events
    add constraint events_time_not_equal check (end_time <> start_time);
