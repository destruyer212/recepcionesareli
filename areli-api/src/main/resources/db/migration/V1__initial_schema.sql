create extension if not exists pgcrypto;

create table clients (
    id uuid primary key default gen_random_uuid(),
    full_name varchar(180) not null,
    document_number varchar(30),
    phone varchar(40),
    whatsapp varchar(40),
    email varchar(180),
    address text,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table floors (
    id uuid primary key default gen_random_uuid(),
    name varchar(80) not null unique,
    level_number int not null unique,
    capacity int,
    area_m2 numeric(10,2),
    status varchar(30) not null default 'AVAILABLE',
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table event_packages (
    id uuid primary key default gen_random_uuid(),
    name varchar(140) not null,
    event_type varchar(80),
    base_price numeric(12,2) not null default 0,
    included_capacity int,
    extra_guest_price numeric(12,2),
    deposit_amount numeric(12,2),
    deposit_percent numeric(5,2),
    guarantee_amount numeric(12,2),
    duration_hours int,
    included_services text,
    terms text,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table events (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references clients(id),
    floor_id uuid not null references floors(id),
    package_id uuid references event_packages(id),
    title varchar(180) not null,
    event_type varchar(80) not null,
    event_date date not null,
    start_time time not null,
    end_time time not null,
    status varchar(40) not null default 'SEPARATED',
    total_amount numeric(12,2) not null default 0,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint events_time_order check (end_time > start_time)
);

create index idx_events_date_floor on events(event_date, floor_id);

create table contracts (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null unique references events(id) on delete cascade,
    contract_number varchar(40) not null unique,
    status varchar(30) not null default 'DRAFT',
    contract_text text,
    signed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table client_payments (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null references events(id) on delete cascade,
    payment_date date not null,
    concept varchar(140) not null,
    amount numeric(12,2) not null,
    method varchar(40) not null,
    internal_receipt_number varchar(50),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table guarantees (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null unique references events(id) on delete cascade,
    amount numeric(12,2) not null default 0,
    received_at date,
    returned_at date,
    retained_amount numeric(12,2) not null default 0,
    status varchar(40) not null default 'PENDING',
    reason text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table staff_members (
    id uuid primary key default gen_random_uuid(),
    full_name varchar(180) not null,
    document_number varchar(30),
    phone varchar(40),
    role varchar(80) not null,
    usual_payment numeric(12,2),
    active boolean not null default true,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table event_staff_assignments (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null references events(id) on delete cascade,
    staff_member_id uuid not null references staff_members(id),
    role varchar(80) not null,
    agreed_payment numeric(12,2) not null default 0,
    paid_amount numeric(12,2) not null default 0,
    payment_status varchar(30) not null default 'PENDING',
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table expenses (
    id uuid primary key default gen_random_uuid(),
    event_id uuid references events(id) on delete set null,
    expense_date date not null,
    category varchar(80) not null,
    description text not null,
    amount numeric(12,2) not null,
    method varchar(40),
    receipt_reference varchar(100),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table inventory_items (
    id uuid primary key default gen_random_uuid(),
    name varchar(160) not null,
    category varchar(80),
    quantity int not null default 0,
    unit_cost numeric(12,2) not null default 0,
    location varchar(120),
    condition_status varchar(40) not null default 'GOOD',
    purchase_date date,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table media_assets (
    id uuid primary key default gen_random_uuid(),
    event_id uuid references events(id) on delete set null,
    title varchar(160) not null,
    media_type varchar(40) not null,
    url text not null,
    visible boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

insert into floors (name, level_number, capacity, area_m2, status, description) values
('1er piso', 1, null, 200, 'AVAILABLE', 'Ambiente para reservas y contratos.'),
('2do piso', 2, null, 200, 'AVAILABLE', 'Ambiente para reservas y contratos.'),
('3er piso', 3, null, null, 'UNDER_CONSTRUCTION', 'Ambiente en construccion, listo para configuracion futura.');

insert into event_packages (name, event_type, base_price, included_capacity, deposit_percent, guarantee_amount, included_services, terms) values
('Paquete Basico', 'General', 3000.00, 80, 30.00, 1000.00, 'Local, decoracion base, mobiliario, mesas, sillas y sonido.', 'Separacion con abono del 30%. Garantia segun condiciones del local.'),
('Paquete Areli', 'General', 10000.00, 80, 30.00, 800.00, 'Local, menaje, torta, bocaditos, cena, brindis, DJ, foto/video, maestro de ceremonia y personal.', 'Separacion con abono del 30%.'),
('Paquete Premium', 'General', 12500.00, 80, 30.00, 800.00, 'Local, servicios completos, cena, brindis, hora loca, barman, candy bar, foto/video y personal.', 'Separacion con abono del 30%.'),
('Promociones escolares', 'Promocion', 0.00, null, null, null, 'Cotizacion por alumno segun cantidad, dia y servicios incluidos.', 'Separacion referencial S/ 800. No incluye IGV/APDAYC segun acuerdo.');
