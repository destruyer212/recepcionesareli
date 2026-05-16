-- Asegura adelanto por defecto en paquetes existentes (30% si no hay regla explícita).
update event_packages
set deposit_percent = 30.00
where coalesce(deposit_percent, 0) = 0
  and coalesce(deposit_amount, 0) = 0
  and base_price > 0
  and lower(name) not like '%promocion%';

update event_packages
set deposit_amount = 800.00
where lower(name) like '%promocion%'
  and coalesce(deposit_amount, 0) = 0;
