import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardRootPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  const role = profile.role as string;

  switch (role) {
    case "admin":
    case "teamleiter":
      redirect("/admin");
    case "berater":
      redirect("/berater");
    case "setter":
      redirect("/setter");
    default:
      redirect("/login");
  }
}
