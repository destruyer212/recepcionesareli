alter table events
    add column apdayc_amount numeric(12,2) not null default 0,
    add column apdayc_payer varchar(80) not null default 'CLIENT',
    add column apdayc_status varchar(40) not null default 'PENDING',
    add column apdayc_notes text;

update event_packages
set included_services = $$Local de 180 m2 con acabado moderno, decoracion base, sillones de rey o reyna, maqueta de torta, arco de ingreso a elegir, alfombra roja, sillas Tiffany transparentes, mesas redondas, bar decorativo de exhibicion, SS.HH., sonido del local, 03 parlantes profesionales, 02 microfonos inalambricos, adorno central de mesa y capacidad referencial de 80 personas.$$
where name = 'Paquete Basico';

update event_packages
set included_services = $$Incluye local y decoracion base, menaje completo, torta de 1.5 kg, 500 bocaditos a escoger entre opciones dulces, saladas y personalizadas, DJ por 4 horas, 03 parlantes, consola, 02 microfonos, foto y filmacion digital, maestro de ceremonia, coordinador, 02 mozos uniformados, seguridad, limpieza de SS.HH., cena de gala a escoger, brindis, agua y gaseosa por mesa, dos rondas de cocktail y hora loca con 02 personajes.$$
where name = 'Paquete Areli';

update event_packages
set included_services = $$Incluye local y decoracion base, menaje premium, torta de 3 kg, 500 bocaditos a escoger, DJ por 4 horas, sonido profesional, foto y filmacion digital, maestro de ceremonia, coordinador, 02 mozos uniformados, seguridad, limpieza de SS.HH., cena de gala a escoger, brindis, agua y gaseosa por mesa, dos rondas de cocktail, hora loca con 03 personajes, barman y mesa de chocolate/candy bar.$$
where name = 'Paquete Premium';

update event_packages
set included_services = $$Cotizacion por alumno segun dia, cantidad de alumnos y servicios contratados. Puede incluir equipo de sonido, maestro de ceremonia, coreografia, filmacion y fotos, personal de cocina, coordinacion, seguridad, mozos, limpieza, bocaditos, buffet/cena, brindis, cortesia para mesa de honor y condiciones especiales de promocion escolar.$$
where name = 'Promociones escolares';

update event_packages
set terms = $$Separacion con abono del 30%. El pago de APDAYC, IGV u otros derechos, permisos o tributos no incluidos sera asumido por el cliente salvo acuerdo escrito distinto. En caso de desistimiento unilateral, los importes entregados por separacion, adelanto y/o garantia no seran reembolsables, debido a la reserva de fecha, bloqueo de disponibilidad, coordinaciones previas y gastos administrativos. La solicitud de cambio de fecha debe comunicarse por escrito con una anticipacion minima de 15 dias calendario a la fecha del evento. Si el cambio es aceptado, el cliente tendra un plazo maximo de 2 meses para reprogramar, sujeto a disponibilidad del local, condiciones vigentes y fechas libres. Vencido dicho plazo sin nueva fecha aceptada, se perdera la garantia y los importes asociados a la separacion.$$
where name in ('Paquete Basico', 'Paquete Areli', 'Paquete Premium');

update event_packages
set terms = $$Separacion referencial con S/ 800. No incluye IGV ni pago de APDAYC, los cuales seran asumidos por la promocion o institucion contratante salvo acuerdo escrito distinto. Una vez separada la fecha no corresponde devolucion de dinero por desistimiento unilateral. Todo cambio de fecha debe solicitarse por escrito con minimo 15 dias calendario de anticipacion; de ser aceptado, la reprogramacion tendra un plazo maximo de 2 meses, sujeto a disponibilidad del local y condiciones vigentes.$$
where name = 'Promociones escolares';
