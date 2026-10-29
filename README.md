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

La base de datos es la **única** fuente de cursos (no hay copia en el código). Si la conexión falla,
la web lo dice en pantalla con el motivo y un botón *Reintentar*, y la consola del navegador (F12)
muestra el detalle con el prefijo `[formación]`:

| Código en "Detalle técnico" | Qué significa | Qué revisar |
| --- | --- | --- |
| `not_configured` | La web se compiló sin las claves | Que exista `.env.local` con las dos variables; reiniciar `npm run dev` o repetir `npm run deploy` |
| `network` | La petición no llegó a Supabase | Internet, `VITE_SUPABASE_URL` bien escrita, proyecto no pausado |
| `request_failed` | Supabase respondió con error (se muestra el código HTTP) | 401: clave incorrecta · 404 / `42P01`: la tabla no existe · 403 / `42501`: permisos |
| `empty` | La consulta funcionó pero no hay cursos visibles | Que se ejecutara el SQL y que exista la política RLS de lectura |

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
