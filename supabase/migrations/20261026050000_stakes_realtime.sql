-- La tarjeta de apuesta se actualiza sola en los dos teléfonos (propuesta, aceptada, quitada, depósitos).
do $pub$
begin
  begin
    alter publication supabase_realtime add table public.match_stakes;
  exception when duplicate_object or undefined_object then null;
  end;
end;
$pub$;
