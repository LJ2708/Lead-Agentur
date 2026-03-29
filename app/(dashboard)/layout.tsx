import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { MobileLayout } from "@/components/dashboard/MobileLayout";
import { EventListener } from "@/components/dashboard/EventListener";
import { SkipToContent } from "@/components/dashboard/SkipToContent";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the user profile to get role and full name
  let { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Profile doesn't exist yet — create it (e.g. after email confirmation)
    const { error: upsertError } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email!,
      full_name: user.user_metadata?.full_name ?? user.email ?? "User",
      phone: user.user_metadata?.phone ?? null,
      role: "berater",
    });

    if (upsertError) {
      console.error("Profil konnte nicht erstellt werden:", upsertError);
      redirect("/login");
    }

    // Re-fetch the profile after creation
    const { data: newProfile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (!newProfile) {
      redirect("/login");
    }

    profile = newProfile;
  }

  const role = profile.role as "admin" | "teamleiter" | "setter" | "berater";

  // Detect if the user is on the onboarding page
  const headersList = await headers();
  const pathname = headersList.get("x-next-pathname") ?? headersList.get("x-invoke-path") ?? "";
  const isOnboardingRoute = pathname.startsWith("/onboarding");

  // For berater: check if they have completed onboarding
  if (role === "berater" && !isOnboardingRoute) {
    const { data: berater } = await supabase
      .from("berater")
      .select("id, status")
      .eq("profile_id", user.id)
      .single();

    if (!berater || berater.status === "pending") {
      redirect("/onboarding");
    }
  }

  // Onboarding route: render without sidebar/topbar (handled by onboarding layout)
  if (isOnboardingRoute) {
    return <>{children}</>;
  }

  // Get berater ID for topbar availability toggle and EventListener
  let topbarBeraterId: string | undefined;
  if (role === "berater") {
    const { data: beraterForTopbar } = await supabase
      .from("berater")
      .select("id")
      .eq("profile_id", user.id)
      .single();
    topbarBeraterId = beraterForTopbar?.id ?? undefined;
  }

  return (
    <>
      <SkipToContent />
      <MobileLayout
        sidebar={<Sidebar role={role} />}
        topbar={
          <Topbar
            user={{
              id: user.id,
              email: user.email ?? "",
              full_name: profile.full_name ?? user.email ?? "User",
              role,
              beraterId: topbarBeraterId,
            }}
          />
        }
      >
        <EventListener userId={user.id} beraterId={topbarBeraterId} />
        {children}
      </MobileLayout>
    </>
  );
}
