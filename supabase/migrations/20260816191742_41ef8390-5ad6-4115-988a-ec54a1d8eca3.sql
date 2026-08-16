ALTER TABLE public.parcours
  ADD COLUMN unite_prix text check (unite_prix in ('total','annuel','mensuel','journalier','horaire'));

NOTIFY pgrst, 'reload schema';