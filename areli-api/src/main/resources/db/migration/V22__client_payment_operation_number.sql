alter table client_payments
    add column if not exists operation_number varchar(80);
