
INSERT INTO public.despachos (id, nombre, ciudad, email, telefono, activo, notas) VALUES
  ('aaaa1111-0000-0000-0000-000000000001', 'Hispajuris Madrid', 'Madrid', 'madrid@hispajuris.es', '+34 910 000 001', true, 'Despacho central'),
  ('aaaa1111-0000-0000-0000-000000000002', 'Hispajuris Barcelona', 'Barcelona', 'barcelona@hispajuris.es', '+34 930 000 002', true, 'Cataluña y Levante'),
  ('aaaa1111-0000-0000-0000-000000000003', 'Hispajuris Sevilla', 'Sevilla', 'sevilla@hispajuris.es', '+34 950 000 003', true, 'Andalucía y Extremadura')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.abogados (id, despacho_id, nombre, email, telefono, activo, notas) VALUES
  ('bbbb2222-0000-0000-0000-000000000001', 'aaaa1111-0000-0000-0000-000000000001', 'María López García', 'maria.lopez@hispajuris.es', '+34 600 100 001', true, 'Especialista en interinos'),
  ('bbbb2222-0000-0000-0000-000000000002', 'aaaa1111-0000-0000-0000-000000000001', 'Carlos Ruiz Pérez', 'carlos.ruiz@hispajuris.es', '+34 600 100 002', true, 'Sector público estatal'),
  ('bbbb2222-0000-0000-0000-000000000003', 'aaaa1111-0000-0000-0000-000000000002', 'Anna Martí Vidal', 'anna.marti@hispajuris.es', '+34 600 100 003', true, 'Catalán e inglés'),
  ('bbbb2222-0000-0000-0000-000000000004', 'aaaa1111-0000-0000-0000-000000000003', 'Javier Moreno Cano', 'javier.moreno@hispajuris.es', '+34 600 100 004', true, 'Sanidad y educación'),
  ('bbbb2222-0000-0000-0000-000000000005', 'aaaa1111-0000-0000-0000-000000000003', 'Lucía Fernández Soto', 'lucia.fernandez@hispajuris.es', '+34 600 100 005', true, 'Junior')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.provincia_abogado (abogado_id, provincia) VALUES
  ('bbbb2222-0000-0000-0000-000000000001', 'Madrid'),
  ('bbbb2222-0000-0000-0000-000000000001', 'Toledo'),
  ('bbbb2222-0000-0000-0000-000000000001', 'Guadalajara'),
  ('bbbb2222-0000-0000-0000-000000000002', 'Ávila'),
  ('bbbb2222-0000-0000-0000-000000000002', 'Segovia'),
  ('bbbb2222-0000-0000-0000-000000000002', 'Cuenca'),
  ('bbbb2222-0000-0000-0000-000000000003', 'Barcelona'),
  ('bbbb2222-0000-0000-0000-000000000003', 'Tarragona'),
  ('bbbb2222-0000-0000-0000-000000000003', 'Girona'),
  ('bbbb2222-0000-0000-0000-000000000003', 'Lleida'),
  ('bbbb2222-0000-0000-0000-000000000003', 'Valencia'),
  ('bbbb2222-0000-0000-0000-000000000004', 'Sevilla'),
  ('bbbb2222-0000-0000-0000-000000000004', 'Cádiz'),
  ('bbbb2222-0000-0000-0000-000000000004', 'Málaga'),
  ('bbbb2222-0000-0000-0000-000000000004', 'Huelva'),
  ('bbbb2222-0000-0000-0000-000000000005', 'Córdoba'),
  ('bbbb2222-0000-0000-0000-000000000005', 'Granada'),
  ('bbbb2222-0000-0000-0000-000000000005', 'Jaén'),
  ('bbbb2222-0000-0000-0000-000000000005', 'Almería'),
  ('bbbb2222-0000-0000-0000-000000000005', 'Badajoz'),
  ('bbbb2222-0000-0000-0000-000000000005', 'Cáceres')
ON CONFLICT DO NOTHING;

INSERT INTO public.leads_interinos (
  nombre, email, telefono, provincia, tipo_relacion, administracion,
  anos_servicio, contratos_sucesivos, situacion_actual, documentos_disponibles,
  urgencia, mensaje_libre, semaforo, perfil, puntuacion_viabilidad, resultado_viabilidad,
  diagnostico_titulo, diagnostico_mensaje, estado, revisado,
  pago_completado, pago_importe, pago_fecha, metodo_pago, created_at
) VALUES
  ('Sara Jiménez Ruiz', 'sara.jimenez@example.com', '+34 612 345 678', 'Madrid', 'Funcionaria interina', 'Comunidad de Madrid (Sanidad)',
   12, true, 'Activa', ARRAY['contrato','vida_laboral','nominas'],
   true, 'Llevo 12 años encadenando contratos como enfermera del SERMAS.',
   'verde', 'funcionario', 88, 'viable',
   'Caso muy viable', 'Cumples los criterios para reclamar.',
   'Cliente', true,
   true, 1500, now() - interval '3 days', 'transferencia', now() - interval '5 days'),

  ('Antonio García López', 'antonio.garcia@example.com', '+34 654 123 987', 'Sevilla', 'Funcionario interino', 'Junta de Andalucía (Educación)',
   9, true, 'Activa', ARRAY['contrato','nominas'],
   false, 'Profesor interino desde 2015 en varios institutos.',
   'verde', 'funcionario', 81, 'viable',
   'Caso viable', 'Tu situación encaja con el TJUE.',
   'En estudio', true,
   false, NULL, NULL, NULL, now() - interval '2 days'),

  ('Marta Soler Puig', 'marta.soler@example.com', '+34 633 456 789', 'Barcelona', 'Personal laboral indefinido no fijo', 'Ayuntamiento de Barcelona',
   6, false, 'Activa', ARRAY['contrato'],
   false, 'Soy auxiliar administrativa en el Ayuntamiento.',
   'ambar', 'laboral', 55, 'revision',
   'Requiere revisión', 'Necesitamos más documentación.',
   'Nuevo', false,
   false, NULL, NULL, NULL, now() - interval '6 hours'),

  ('Pedro Navarro Cano', 'pedro.navarro@example.com', '+34 677 888 999', 'Málaga', 'Funcionario interino', 'SAS (Servicio Andaluz de Salud)',
   15, true, 'Cesada hace menos de 1 mes', ARRAY['contrato','vida_laboral','nominas','cese'],
   true, 'Me cesaron hace 2 semanas tras 15 años. Ayuda urgente.',
   'rojo', 'funcionario', 95, 'urgente',
   'URGENTE — plazo crítico', 'Tienes 20 días hábiles desde el cese.',
   'Nuevo', false,
   false, NULL, NULL, NULL, now() - interval '2 hours'),

  ('Carmen Ortiz Belda', 'carmen.ortiz@example.com', '+34 622 111 222', 'Valencia', 'Funcionaria interina', 'Generalitat Valenciana (Educación)',
   11, true, 'Activa', ARRAY['contrato','nominas','vida_laboral'],
   false, 'Maestra interina desde 2014.',
   'verde', 'funcionario', 84, 'viable',
   'Caso viable', 'Te enviaremos propuesta esta semana.',
   'Propuesta enviada', true,
   true, 1500, now() - interval '1 day', 'stripe', now() - interval '8 days'),

  ('Luis Hernández Pino', 'luis.hernandez@example.com', '+34 611 222 333', 'Granada', 'Personal laboral temporal', 'Diputación de Granada',
   2, false, 'Activa', ARRAY['contrato'],
   false, 'Llevo 2 años con contrato temporal.',
   'rojo', 'laboral', 25, 'inviable',
   'Antigüedad insuficiente', 'Necesitas más años de servicio.',
   'Descartado', true,
   false, NULL, NULL, NULL, now() - interval '4 days'),

  ('Rocío Vega Marín', 'rocio.vega@example.com', '+34 644 555 666', 'Cádiz', 'Funcionaria interina', 'Junta de Andalucía (Sanidad)',
   8, true, 'Activa', ARRAY['contrato','nominas'],
   false, 'Técnica de laboratorio desde 2016.',
   'verde', 'funcionario', 78, 'viable',
   'Caso viable', NULL,
   'En estudio', true,
   true, 1500, now() - interval '12 hours', 'bizum', now() - interval '3 days'),

  ('Jordi Puig Rovira', 'jordi.puig@example.com', '+34 699 333 444', 'Tarragona', 'Personal laboral indefinido no fijo', 'Generalitat de Catalunya',
   7, true, 'Activa', ARRAY['contrato','vida_laboral'],
   false, 'Llevo 7 años como técnico medio.',
   'ambar', 'laboral', 62, 'revision',
   'Requiere revisión', NULL,
   'Nuevo', false,
   false, NULL, NULL, NULL, now() - interval '30 minutes'),

  ('Isabel Romero Díaz', 'isabel.romero@example.com', '+34 666 777 888', 'Toledo', 'Funcionaria interina', 'Castilla-La Mancha (Educación)',
   13, true, 'Activa', ARRAY['contrato','nominas','vida_laboral','cese'],
   false, 'Profesora interina con 13 años de servicio.',
   'verde', 'funcionario', 90, 'viable',
   'Caso muy viable', NULL,
   'Cliente', true,
   true, 1500, now() - interval '10 days', 'transferencia', now() - interval '15 days'),

  ('Manuel Vargas Ríos', 'manuel.vargas@example.com', '+34 655 444 333', 'Cáceres', 'Funcionario interino', 'Junta de Extremadura',
   10, true, 'Cesada hace menos de 1 mes', ARRAY['contrato','vida_laboral','nominas','cese'],
   true, 'Cese reciente tras 10 años. Quiero reclamar ya.',
   'rojo', 'funcionario', 92, 'urgente',
   'URGENTE — plazo crítico', NULL,
   'Nuevo', false,
   false, NULL, NULL, NULL, now() - interval '1 hour'),

  ('Núria Bosch Torres', 'nuria.bosch@example.com', '+34 688 999 000', 'Barcelona', 'Personal laboral indefinido no fijo', 'Diputació de Barcelona',
   9, true, 'Activa', ARRAY['contrato','nominas'],
   false, 'Llevo 9 años como técnica de gestión.',
   'verde', 'laboral', 76, 'viable',
   'Caso viable', NULL,
   'Propuesta enviada', true,
   true, 1500, now() - interval '6 days', 'stripe', now() - interval '9 days'),

  ('Francisco Aguilar Mesa', 'fran.aguilar@example.com', '+34 622 333 444', 'Córdoba', 'Funcionario interino', 'Ayuntamiento de Córdoba',
   5, false, 'Activa', ARRAY['contrato'],
   false, 'Administrativo del ayuntamiento desde hace 5 años.',
   'ambar', 'funcionario', 58, 'revision',
   'Requiere revisión', NULL,
   'Nuevo', false,
   false, NULL, NULL, NULL, now() - interval '4 hours');
