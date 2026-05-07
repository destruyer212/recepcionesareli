alter table clients
    add column if not exists document_type varchar(10);
