ALTER TABLE public.parcours DROP COLUMN format;

DROP TYPE public.format_parcours;

CREATE TYPE public.format_parcours AS ENUM ('distanciel', 'presentiel', 'alternance');

ALTER TABLE public.parcours
  ADD COLUMN formats public.format_parcours[] NOT NULL DEFAULT '{}'::public.format_parcours[];