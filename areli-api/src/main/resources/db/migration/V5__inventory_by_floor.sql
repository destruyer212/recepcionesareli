alter table inventory_items
    add column if not exists floor_id uuid references floors(id),
    add column if not exists specific_location varchar(160),
    add column if not exists minimum_quantity int not null default 0,
    add column if not exists active boolean not null default true;

update inventory_items
set specific_location = location
where specific_location is null
  and location is not null;

update inventory_items item
set floor_id = floor.id
from floors floor
where item.floor_id is null
  and lower(coalesce(item.location, '')) = lower(floor.name);

create index if not exists idx_inventory_items_floor on inventory_items(floor_id);
create index if not exists idx_inventory_items_category on inventory_items(category);
