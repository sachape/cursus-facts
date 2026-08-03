CREATE TYPE public.modalite_acces AS ENUM ('libre','compte_requis','compte_produit_requis','certificat_payant','freemium','pris_en_charge');

ALTER TABLE public.parcours ADD COLUMN modalite_acces public.modalite_acces;
ALTER TABLE public.parcours ADD COLUMN source_modalite_acces text;