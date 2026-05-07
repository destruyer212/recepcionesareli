update event_packages
set name = 'Paquete Básico'
where name = 'Paquete Basico';

update event_packages
set included_services = $$Local de 180 m2 con acabado moderno, decoración base, sillones de rey o reina, maqueta de torta, arco de ingreso a elegir, alfombra roja, sillas Tiffany transparentes, mesas redondas, bar decorativo de exhibición, SS.HH., sonido del local, 03 parlantes profesionales, 02 micrófonos inalámbricos, adorno central de mesa y capacidad referencial de 80 personas.$$
where name = 'Paquete Básico';

update event_packages
set included_services = $$Incluye local y decoración base, menaje completo, torta de 1.5 kg, 500 bocaditos a escoger entre opciones dulces, saladas y personalizadas, DJ por 4 horas, 03 parlantes, consola, 02 micrófonos, foto y filmación digital, maestro de ceremonia, coordinador, 02 mozos uniformados, seguridad, limpieza de SS.HH., cena de gala a escoger, brindis, agua y gaseosa por mesa, dos rondas de cóctel y hora loca con 02 personajes.$$
where name = 'Paquete Areli';

update event_packages
set included_services = $$Incluye local y decoración base, menaje premium, torta de 3 kg, 500 bocaditos a escoger, DJ por 4 horas, sonido profesional, foto y filmación digital, maestro de ceremonia, coordinador, 02 mozos uniformados, seguridad, limpieza de SS.HH., cena de gala a escoger, brindis, agua y gaseosa por mesa, dos rondas de cóctel, hora loca con 03 personajes, barman y mesa de chocolate/candy bar.$$
where name = 'Paquete Premium';

update event_packages
set included_services = $$Cotización por alumno según día, cantidad de alumnos y servicios contratados. Puede incluir equipo de sonido, maestro de ceremonia, coreografía, filmación y fotos, personal de cocina, coordinación, seguridad, mozos, limpieza, bocaditos, buffet/cena, brindis, cortesía para mesa de honor y condiciones especiales de promoción escolar.$$
where name = 'Promociones escolares';

update event_packages
set terms = $$Separación con abono del 30%. El pago de APDAYC, IGV u otros derechos, permisos o tributos no incluidos será asumido por el cliente salvo acuerdo escrito distinto. En caso de desistimiento unilateral, los importes entregados por separación, adelanto y/o garantía no serán reembolsables, debido a la reserva de fecha, bloqueo de disponibilidad, coordinaciones previas y gastos administrativos. La solicitud de cambio de fecha debe comunicarse por escrito con una anticipación mínima de 15 días calendario a la fecha del evento. Si el cambio es aceptado, el cliente tendrá un plazo máximo de 2 meses para reprogramar, sujeto a disponibilidad del local, condiciones vigentes y fechas libres. Vencido dicho plazo sin nueva fecha aceptada, se perderá la garantía y los importes asociados a la separación.$$
where name in ('Paquete Básico', 'Paquete Areli', 'Paquete Premium');

update event_packages
set terms = $$Separación referencial con S/ 800. No incluye IGV ni pago de APDAYC, los cuales serán asumidos por la promoción o institución contratante salvo acuerdo escrito distinto. Una vez separada la fecha no corresponde devolución de dinero por desistimiento unilateral. Todo cambio de fecha debe solicitarse por escrito con mínimo 15 días calendario de anticipación; de ser aceptado, la reprogramación tendrá un plazo máximo de 2 meses, sujeto a disponibilidad del local y condiciones vigentes.$$
where name = 'Promociones escolares';

update events
set event_type = 'Cumpleaños'
where event_type = 'Cumpleanos';

update events
set event_type = 'Promoción'
where event_type = 'Promocion';

update events
set event_type = '15 años'
where event_type = '15 anos';
