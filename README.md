# Prueba Orientador Laboral IT

Orientación laboral para jóvenes que buscan su primer empleo en tecnología: diagnóstico, plan de acción,
práctica de entrevistas y formación gratuita o subvencionada.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # en Windows: copy .env.example .env.local
npm run dev
```

## Base de datos de formación (Supabase)

Los cursos que recomienda el plan de acción se leen de la tabla `training_resources` de Supabase.

1. En Supabase Studio abre **SQL Editor → New query**, pega el contenido de
   [`supabase/training_resources.sql`](supabase/training_resources.sql) y pulsa **Run**.
   Debe terminar mostrando `total 30 · relacionados_it 21`. Se puede volver a ejecutar sin problema.
2. En **Project Settings → API** copia la *Project URL* y la clave pública (*anon* o *publishable*)
   en `.env.local`.
3. `npm run dev` y entra como joven: en *Plan de acción* aparece el bloque **Cursos para lo que te falta**.

Si `.env.local` no existe o Supabase no responde, la app usa una copia local del catálogo
(`src/data/trainingCatalog.ts`) y lo indica en *Formación recomendada*.

### Cómo se recomienda

- `src/data/requirementSkills.ts` traduce cada requisito del puesto (p. ej. "HTML5 & CSS3") a habilidades
  del catálogo (p. ej. `HTML/CSS`).
- Cada curso tiene en la columna `skills` las habilidades que cubre, con **el mismo texto exacto**.
- `src/lib/courseRecommendations.ts` ordena los cursos por cuántos requisitos pendientes cubren y, a igualdad,
  prefiere los gratuitos o subvencionados, en español y con certificado.

### Añadir o editar cursos

Desde **Table Editor → training_resources**. Para que un curso se recomiende necesita `it_related = true`,
`active = true` y habilidades en `skills` del vocabulario de `requirementSkills.ts`.
La web solo puede **leer** la tabla (políticas RLS); los cambios se hacen siempre desde Studio.

## Publicar

```bash
npm run deploy
```

El build incluye los valores de `.env.local`, así que hay que tenerlo en el ordenador desde el que se publica.
