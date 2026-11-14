-- Ajuste de ad_requests al arte de Stan (tabla aún vacía): la sección pasa a ser uno de los 5 espacios
-- reales de anuncio, y el texto del anuncio es corto (el formulario cuenta hasta 60; la base deja 5–500).
alter table public.ad_requests drop constraint if exists ad_requests_section_check;
alter table public.ad_requests add constraint ad_requests_section_check
  check (section in ('inicio-franja', 'inicio-ficha', 'inicio-copas', 'grupos-publicos', 'torneos-lista'));
alter table public.ad_requests drop constraint if exists ad_requests_message_check;
alter table public.ad_requests add constraint ad_requests_message_check
  check (char_length(btrim(message)) between 5 and 500);
