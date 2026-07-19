revoke execute on function public.audit_trigger()      from public, anon, authenticated;
revoke execute on function public.auto_slug()          from public, anon, authenticated;
revoke execute on function public.update_updated_at()  from public, anon, authenticated;
revoke execute on function public.is_super_admin()     from public, anon, authenticated;
grant execute on function public.audit_trigger()       to postgres, service_role;
grant execute on function public.auto_slug()           to postgres, service_role;
grant execute on function public.update_updated_at()   to postgres, service_role;
grant execute on function public.is_super_admin()      to postgres, service_role;
