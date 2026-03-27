import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // User is logged in — redirect to dashboard
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  switch (profile?.role) {
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
