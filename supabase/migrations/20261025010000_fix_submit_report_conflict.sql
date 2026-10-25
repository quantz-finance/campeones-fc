-- submit_match_report: "column reference match_id is ambiguous" (42702).
-- El parámetro match_id choca con la columna en `on conflict (match_id, reporter_id)`, así que
-- ningún partido podía confirmarse. Se usa la restricción por nombre; el resto de la función queda igual.
do $mig$
declare
  def text := pg_get_functiondef('public.submit_match_report(uuid, boolean, uuid, int, int)'::regprocedure);
  fixed text;
begin
  fixed := replace(def, 'on conflict (match_id, reporter_id) do update', 'on conflict on constraint match_reports_pkey do update');
  if fixed = def then
    raise notice 'submit_match_report ya estaba corregida';
    return;
  end if;
  execute fixed;
end
$mig$;
