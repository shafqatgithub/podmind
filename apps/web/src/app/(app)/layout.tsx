import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards these routes; this is defense-in-depth.
  if (!user) redirect("/login");

  return (
    <AppShell
      user={{
        email: user.email ?? "",
        name: (user.user_metadata.full_name as string | undefined) ?? null,
        avatarUrl: (user.user_metadata.avatar_url as string | undefined) ?? null,
      }}
    >
      {children}
    </AppShell>
  );
}
