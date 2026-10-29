-- =============================================================================
-- Orientador Laboral IT · Recursos de formación
-- -----------------------------------------------------------------------------
-- Cómo usarlo: Supabase Studio → SQL Editor → New query → pega este archivo → Run.
-- Se puede ejecutar varias veces: crea la tabla si no existe y actualiza los datos.
--
-- Origen de los datos: hoja "Recursos de formación" del equipo (30 recursos).
--   · Entidad, precio, idioma y enlace salen de la hoja.
--   · skills, target_roles, category y modality son una clasificación propia para
--     poder recomendar cursos según lo que le falta al joven en su plan de acción.
--   · Los 9 recursos sin relación con el empleo IT se guardan con it_related = false:
--     están en la base de datos, pero la app no los recomienda.
-- =============================================================================

create table if not exists public.training_resources (
  id                      text primary key,
  ref_code                text unique,
  title                   text not null,
  provider                text not null,
  description             text not null,
  url                     text not null check (url like 'https://%'),
  price_type              text not null check (price_type in ('subvencionado', 'abierto', 'mixto')),
  language                text not null check (language in ('Español', 'Inglés', 'Multilingüe')),
  modality                text not null default 'Online' check (modality in ('Online', 'Presencial', 'Híbrido')),
  category                text check (category in ('frontend', 'backend', 'cloud_devops', 'cybersecurity', 'ai_data', 'soft_skills')),
  -- Habilidades que cubre el recurso. Deben usar el mismo vocabulario que
  -- src/data/requirementSkills.ts (p. ej. 'JavaScript', 'HTML/CSS', 'Testing').
  skills                  text[] not null default '{}',
  target_roles            text[] not null default '{}',
  official_certification  boolean not null default false,
  certification_issuer    text check (certification_issuer in ('estatal', 'fabricante')),
  certification_name      text,
  it_related              boolean not null default true,
  active                  boolean not null default true,
  sort_order              integer not null default 0,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table public.training_resources is 'Recursos de formación gratuitos, subvencionados o mixtos que recomienda el Orientador Laboral IT.';

-- Búsquedas rápidas por habilidad (p. ej. skills && array['React','Git']).
create index if not exists training_resources_skills_idx on public.training_resources using gin (skills);

-- updated_at se actualiza solo al editar una fila desde Studio.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists training_resources_updated_at on public.training_resources;
create trigger training_resources_updated_at
  before update on public.training_resources
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Seguridad (Row Level Security)
-- La web es pública y lleva la clave "anon/publishable" dentro del código, así que
-- cualquiera puede usarla. Por eso solo se permite LEER recursos activos; nadie
-- puede crear, editar ni borrar desde la web. Los cambios se hacen desde Studio.
-- -----------------------------------------------------------------------------
alter table public.training_resources enable row level security;

drop policy if exists "Lectura pública de recursos activos" on public.training_resources;
create policy "Lectura pública de recursos activos"
  on public.training_resources
  for select
  to anon, authenticated
  using (active);

revoke insert, update, delete on public.training_resources from anon, authenticated;
grant select on public.training_resources to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Datos
-- -----------------------------------------------------------------------------
insert into public.training_resources (id, ref_code, title, provider, description, url, price_type, language, modality, category, skills, target_roles, official_certification, certification_issuer, certification_name, it_related, sort_order)
values
  ('garantia-juvenil', 'SEPE-GJ-01', 'Ofertas de formación y empleo de Garantía Juvenil', 'Sistema Nacional de Garantía Juvenil', 'Formación gratuita y oportunidades remuneradas para jóvenes de 16 a 29 años que quieren mejorar su empleabilidad o encontrar su primer empleo.', 'https://www.sepe.es/HomeSepe/encontrar-trabajo/Garantia-Juvenil/ofertas-garantia-juvenil.html', 'subvencionado', 'Español', 'Híbrido', 'soft_skills', array['Empleabilidad', 'Competencias digitales']::text[], array['Sin experiencia previa', 'Primer empleo']::text[], false, null, null, true, 1),
  ('sepe-certificados-fp', 'SEPE-FP-02', 'Certificados Profesionales de FP', 'Servicio Público de Empleo Estatal (SEPE)', 'Acreditaciones oficiales de Formación Profesional, incluida la familia de Informática y Comunicaciones (desarrollo web, programación, bases de datos, redes y seguridad).', 'https://www.todofp.es/inicio.html', 'subvencionado', 'Español', 'Híbrido', 'backend', array['Fundamentos de programación', 'HTML/CSS', 'Diseño responsive', 'JavaScript', 'SQL', 'Java', 'Redes', 'Seguridad']::text[], array['Junior Frontend', 'Junior Backend', 'Sistemas y redes']::text[], true, 'estatal', 'Certificado Profesional (FP)', true, 2),
  ('fundae', 'FUNDAE-03', 'Formación subvencionada para trabajadores y autónomos', 'FUNDAE (Fundación Estatal para la Formación en el Empleo)', 'Formación estatal subvencionada para empresas, personas trabajadoras y autónomas. Útil para quien ya trabaja y quiere reorientarse hacia el sector IT.', 'https://experienciafundae.es/formacion-subvencionada', 'subvencionado', 'Español', 'Híbrido', 'soft_skills', array['Competencias digitales', 'Excel', 'Cloud', 'Seguridad']::text[], array['Reconversión laboral', 'Primer empleo']::text[], false, null, null, true, 3),
  ('gencat-cifo', 'GENCAT-CIFO-04', 'Centres d''Innovació i Formació Ocupacional (CIFO)', 'Generalitat de Catalunya', 'Centros propios del Servei d’Ocupació de Catalunya con especialidades de formación ocupacional, entre ellas informática y comunicaciones.', 'https://serveiocupacio.gencat.cat/ca/soc/com-ens-organitzem/centres-propis-formacio-cifo-cfpa/centres-dinnovacio-i-formacio-ocupacional-cifo/', 'subvencionado', 'Español', 'Presencial', 'backend', array['Fundamentos de programación', 'Redes', 'Competencias digitales', 'Excel']::text[], array['Junior Backend', 'Sistemas y redes', 'Reconversión laboral']::text[], false, null, null, true, 4),
  ('gencat-cercador', 'GENCAT-CERC-05', 'Buscador integrado de cursos, especialidades y centros de formación', 'Generalitat de Catalunya', 'Buscador del Servei d’Ocupació de Catalunya para localizar cursos subvencionados por especialidad, territorio y centro.', 'https://serveiocupacio.gencat.cat/ca/persones/vull-formar-me/cercadors-formacio-especialitats/cercador-integrat', 'subvencionado', 'Español', 'Híbrido', 'soft_skills', array['Competencias digitales', 'Empleabilidad']::text[], array['Sin experiencia previa', 'Reconversión laboral']::text[], false, null, null, true, 5),
  ('fpdgi-generacio-talent', 'FPDGI-GT-06', 'Generació Talent: mentoring, talleres y e-learning', 'Fundació Princesa de Girona', 'Programa de acompañamiento para jóvenes con mentoring, talleres y formación online orientados a la empleabilidad.', 'https://www.fpdgi.org/ca/programes/generacio-talent/', 'subvencionado', 'Español', 'Híbrido', 'soft_skills', array['Mentoría', 'Empleabilidad', 'Comunicación']::text[], array['Sin experiencia previa', 'Primer empleo']::text[], false, null, null, true, 6),
  ('paco-puerto-ccoo', 'CCOO-FPP-07', 'Oferta formativa: acreditaciones y formación ocupacional', 'Fundació Paco Puerto CCOO', 'Cursos de acreditación de competencias, preparación de oposiciones y formación ocupacional.', 'https://fundaciopacopuerto.cat/cursos/', 'mixto', 'Español', 'Híbrido', 'soft_skills', array['Competencias digitales', 'Empleabilidad']::text[], array['Reconversión laboral']::text[], false, null, null, true, 7),
  ('fad-goetech-academy', 'FAD-GOETECH-08', 'GoeTech Academy: certificaciones Microsoft, Cisco, Meta e IBM SkillsBuild', 'Fundación Fad Juventud', 'Itinerarios del campus de Fad Juventud que preparan para certificados de grandes empresas tecnológicas, muy valorados al buscar trabajo.', 'https://www.campusfad.org/goetech-academy/', 'subvencionado', 'Multilingüe', 'Online', 'cloud_devops', array['Cloud', 'Redes', 'Seguridad', 'IA', 'Python', 'Competencias digitales']::text[], array['Junior Frontend', 'Junior Backend', 'Cloud', 'Ciberseguridad', 'Sin experiencia previa']::text[], true, 'fabricante', 'Microsoft · Cisco · Meta · IBM SkillsBuild', true, 8),
  ('wipo-academy', null, 'Academia de propiedad intelectual (IP)', 'World Intellectual Property Organization (WIPO)', 'La academia de la OMPI: centro de formación sobre propiedad intelectual.', 'https://welc.wipo.int/acc/index.jsf?lang=en', 'abierto', 'Inglés', 'Online', null, '{}'::text[], '{}'::text[], false, null, null, false, 9),
  ('securiti-education', 'SECURITI-09', 'Certificaciones: AI Governance, Data Security y PrivacyOps', 'Securiti Education', 'Certificaciones gratuitas sobre el uso responsable de la IA, la seguridad de los datos y la privacidad.', 'https://education.securiti.ai/certifications/ai-governance/', 'abierto', 'Inglés', 'Online', 'cybersecurity', array['Gobernanza IA', 'Ética IA', 'Protección de datos', 'Seguridad']::text[], array['Ciberseguridad', 'Gobernanza IA']::text[], true, 'fabricante', 'Securiti AI Governance / Data Security / PrivacyOps', true, 10),
  ('amnistia-ddhh', null, 'Academia de los Derechos Humanos', 'Amnistía Internacional', 'Cursos online de Amnistía Internacional sobre derechos humanos.', 'https://www.amnesty.org/es/get-involved/online-courses/', 'abierto', 'Multilingüe', 'Online', null, '{}'::text[], '{}'::text[], false, null, null, false, 11),
  ('oms-academy', null, 'Cursos sobre temas esenciales de salud', 'World Health Organization (WHO)', 'Recopilación de cursos de la Organización Mundial de la Salud.', 'https://www.who.int/about/who-academy', 'abierto', 'Multilingüe', 'Online', null, '{}'::text[], '{}'::text[], false, null, null, false, 12),
  ('ashoka-learning', 'ASHOKA-10', 'Innovación social, changemaking y cambio sistémico', 'Ashoka Learning Ecosystem', 'Recursos de aprendizaje sobre innovación social y liderazgo de proyectos con impacto.', 'https://ale.ashoka.org/', 'abierto', 'Multilingüe', 'Online', 'soft_skills', array['Emprendimiento social', 'Comunicación']::text[], array['Primer empleo']::text[], false, null, null, true, 13),
  ('uncc-elearn', null, 'Cambio climático, economía circular y economía verde', 'Partnership for Action on Green Economy (PAGE) - United Nations Climate Change', 'Catálogo de cursos de la plataforma de Naciones Unidas sobre cambio climático.', 'https://unccelearn.org/courses/', 'abierto', 'Multilingüe', 'Online', null, '{}'::text[], '{}'::text[], false, null, null, false, 14),
  ('salto-youth', null, 'Educación no formal para el trabajo juvenil', 'SALTO-YOUTH (Support, Advanced Learning and Training Opportunities for Youth)', 'Manuales, herramientas y calendario europeo de formación para trabajadores juveniles y organizaciones.', 'https://www.salto-youth.net/tools/european-training-calendar/browse/', 'subvencionado', 'Multilingüe', 'Online', null, '{}'::text[], '{}'::text[], false, null, null, false, 15),
  ('mckinsey-forward', 'MCK-FWD-11', 'McKinsey.org Forward', 'McKinsey.org', 'Programa para estudiantes, personas en búsqueda de empleo y profesionales centrado en habilidades transversales para el trabajo.', 'https://www.mckinsey.org/our-programs/forward/overview', 'abierto', 'Multilingüe', 'Online', 'soft_skills', array['Empleabilidad', 'Comunicación', 'Resolución de problemas', 'Competencias digitales']::text[], array['Primer empleo', 'Reconversión laboral']::text[], false, null, null, true, 16),
  ('elearningproject-eu', null, 'Materiales de proyectos Erasmus+', 'ELearningProject.eu', 'Cursos y materiales educativos desarrollados en Erasmus+ y otros proyectos europeos.', 'https://elearningproject.eu/', 'abierto', 'Inglés', 'Online', null, '{}'::text[], '{}'::text[], false, null, null, false, 17),
  ('coursera', 'COURSERA-12', 'MOOCs, especializaciones y preparación para certificados tech', 'Coursera', 'Plataforma con cursos de universidades y empresas tecnológicas. Muchos cursos se pueden seguir gratis; el certificado suele ser de pago.', 'https://www.coursera.org/', 'mixto', 'Multilingüe', 'Online', 'ai_data', array['Python', 'SQL', 'NoSQL', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Java', 'Git', 'Testing', 'Ciencia de datos', 'Visualización de datos', 'Excel', 'Estadística', 'Cloud', 'Seguridad', 'IA']::text[], array['Junior Frontend', 'Junior Backend', 'Datos & IA', 'Ciberseguridad']::text[], false, null, null, true, 18),
  ('khan-academy', 'KHAN-13', 'Matemáticas, ciencias y programación', 'Khan Academy', 'Cursos gratuitos de matemáticas, ciencias, economía y programación. Buen punto de partida sin conocimientos previos.', 'https://es.khanacademy.org/', 'abierto', 'Multilingüe', 'Online', 'frontend', array['Fundamentos de programación', 'HTML/CSS', 'JavaScript', 'SQL', 'Matemáticas', 'Estadística']::text[], array['Sin experiencia previa']::text[], false, null, null, true, 19),
  ('freecodecamp', 'FCC-14', 'Plataforma interactiva de desarrollo de software', 'freeCodeCamp', 'Currículo práctico y gratuito de desarrollo web y programación basado en proyectos, con certificados propios de la plataforma.', 'https://www.freecodecamp.org/', 'abierto', 'Inglés', 'Online', 'frontend', array['HTML/CSS', 'Diseño responsive', 'JavaScript', 'React', 'Node.js', 'APIs REST', 'Python', 'SQL', 'PostgreSQL', 'NoSQL', 'Git', 'Testing', 'Ciencia de datos', 'Seguridad']::text[], array['Junior Frontend', 'Junior Backend', 'Full Stack', 'Sin experiencia previa']::text[], false, null, null, true, 20),
  ('edx', 'EDX-15', 'MOOCs, especializaciones y preparación para certificados tech', 'edX', 'Cursos de universidades internacionales. El contenido suele ser de acceso libre y el certificado verificado, de pago.', 'https://www.edx.org/', 'mixto', 'Multilingüe', 'Online', 'ai_data', array['Fundamentos de programación', 'Python', 'Java', 'SQL', 'HTML/CSS', 'JavaScript', 'Ciencia de datos', 'Estadística', 'IA']::text[], array['Junior Backend', 'Datos & IA', 'Full Stack']::text[], false, null, null, true, 21),
  ('uned-abierta', 'UNED-16', 'Cursos MOOC gratuitos y materiales de divulgación', 'UNED Abierta', 'Plataforma de cursos online gratuitos (MOOC) de la UNED, con materiales de divulgación e investigación en español.', 'https://iedra.uned.es/', 'abierto', 'Español', 'Online', 'soft_skills', array['Competencias digitales', 'Fundamentos de programación']::text[], array['Sin experiencia previa', 'Reconversión laboral']::text[], false, null, null, true, 22),
  ('unesco-openlearning', null, 'Educación, ciencias, cultura y comunicación', 'UNESCO OpenLearning', 'Cursos gratuitos en línea de la UNESCO.', 'https://openlearning.unesco.org/', 'abierto', 'Multilingüe', 'Online', null, '{}'::text[], '{}'::text[], false, null, null, false, 23),
  ('mit-ocw', 'MIT-OCW-17', '2.500 cursos del Massachusetts Institute of Technology', 'MIT OpenCourseWare', 'Materiales completos de asignaturas del MIT, incluidas ciencias de la computación y programación en Python. Sin certificado.', 'https://ocw.mit.edu/', 'abierto', 'Inglés', 'Online', 'ai_data', array['Fundamentos de programación', 'Python', 'Matemáticas', 'Estadística', 'Ciencia de datos', 'IA']::text[], array['Junior Backend', 'Datos & IA']::text[], false, null, null, true, 24),
  ('futurelearn', 'FUTURELEARN-18', 'MOOCs, especializaciones y preparación para certificados tech', 'FutureLearn', 'Cursos online de universidades y organizaciones, con acceso gratuito limitado y opciones de pago.', 'https://www.futurelearn.com/', 'mixto', 'Inglés', 'Online', 'cloud_devops', array['Cloud', 'Seguridad', 'Python', 'Ciencia de datos', 'IA']::text[], array['Cloud', 'Ciberseguridad', 'Datos & IA']::text[], false, null, null, true, 25),
  ('udemy', 'UDEMY-19', 'Cursos en vídeo de programación, diseño y negocio', 'Udemy', 'Catálogo muy amplio de cursos en vídeo. Hay cursos gratuitos, pero la mayoría son de pago y la calidad varía.', 'https://www.udemy.com/', 'mixto', 'Multilingüe', 'Online', 'frontend', array['HTML/CSS', 'Diseño responsive', 'JavaScript', 'TypeScript', 'React', 'Vue', 'Tailwind', 'Node.js', 'Java', 'Python', 'SQL', 'PostgreSQL', 'NoSQL', 'APIs REST', 'Git', 'Testing', 'Excel', 'Visualización de datos']::text[], array['Junior Frontend', 'Junior Backend', 'Full Stack']::text[], false, null, null, true, 26),
  ('saylor', 'SAYLOR-20', 'Certificados gratuitos en Computer Science, matemáticas e inglés', 'Saylor Academy', 'Cursos a tu ritmo, con certificado gratuito de la plataforma, en informática, negocio, matemáticas e inglés.', 'https://www.saylor.org/Programs', 'abierto', 'Inglés', 'Online', 'backend', array['Fundamentos de programación', 'Redes', 'Matemáticas', 'Estadística', 'Inglés']::text[], array['Junior Backend', 'Sin experiencia previa']::text[], false, null, null, true, 27),
  ('cruz-roja-pildoras', null, 'Píldoras formativas de salud y medio ambiente', 'Cruz Roja', 'Lecciones breves sobre salud física y mental y medio ambiente.', 'https://www2.cruzroja.es/pildoras-formativas-cruz-roja', 'abierto', 'Español', 'Online', null, '{}'::text[], '{}'::text[], false, null, null, false, 28),
  ('cruz-roja-elearning', null, 'Cursos de autoaprendizaje del Campus Virtual', 'Cruz Roja', 'Cursos online abiertos para personas voluntarias y personal laboral de Cruz Roja.', 'https://www2.cruzroja.es/cursos-formacion-e-learning', 'abierto', 'Español', 'Online', null, '{}'::text[], '{}'::text[], false, null, null, false, 29),
  ('santander-open-academy', 'SANTANDER-21', 'Cursos, becas de estudios y becas de movilidad', 'Santander Open Academy', 'Cursos gratuitos y convocatorias de becas para formación y movilidad.', 'https://www.santanderopenacademy.com/en/index.html', 'abierto', 'Multilingüe', 'Online', 'soft_skills', array['Competencias digitales', 'IA', 'Inglés', 'Empleabilidad']::text[], array['Sin experiencia previa', 'Primer empleo', 'Reconversión laboral']::text[], false, null, null, true, 30)
on conflict (id) do update set
  ref_code               = excluded.ref_code,
  title                  = excluded.title,
  provider               = excluded.provider,
  description            = excluded.description,
  url                    = excluded.url,
  price_type             = excluded.price_type,
  language               = excluded.language,
  modality               = excluded.modality,
  category               = excluded.category,
  skills                 = excluded.skills,
  target_roles           = excluded.target_roles,
  official_certification = excluded.official_certification,
  certification_issuer   = excluded.certification_issuer,
  certification_name     = excluded.certification_name,
  it_related             = excluded.it_related,
  sort_order             = excluded.sort_order;

-- Comprobación: debería devolver 30 filas en total y 21 relacionadas con IT.
select count(*) as total, count(*) filter (where it_related) as relacionados_it
from public.training_resources;
