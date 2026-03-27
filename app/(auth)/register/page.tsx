"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    if (password.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
          },
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      // If email confirmation is disabled and user is immediately confirmed,
      // create the profile and redirect to onboarding
      if (data.user && data.session) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: data.user.id,
          email,
          full_name: fullName,
          phone,
          role: "berater",
        });

        if (profileError) {
          console.error("Profil konnte nicht erstellt werden:", profileError);
        }

        window.location.href = "/onboarding";
        return;
      }

      // Otherwise email confirmation is required
      setSuccess(true);
    } catch {
      setError("Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">E-Mail bestätigen</CardTitle>
          <CardDescription>
            Wir haben einen Bestätigungslink an <strong>{email}</strong> gesendet.
            Bitte prüfen Sie Ihren Posteingang und klicken Sie auf den Link, um
            Ihr Konto zu aktivieren.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nach der Bestätigung und Anmeldung werden Sie zur Paketauswahl
            weitergeleitet.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Bereits bestätigt?{" "}
            <Link
              href="/login"
              className="font-medium text-[#2563EB] hover:underline"
            >
              Anmelden
            </Link>
          </p>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Konto erstellen</CardTitle>
        <CardDescription>
          Starten Sie jetzt mit LeadSolution. Nach der Registrierung werden Sie
          zur Paketauswahl weitergeleitet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName">Vollständiger Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Max Mustermann"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@beispiel.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Telefonnummer (optional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+49 170 1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mindestens 6 Zeichen"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="passwordConfirm">Passwort bestätigen</Label>
            <Input
              id="passwordConfirm"
              type="password"
              placeholder="Passwort wiederholen"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="mt-2 w-full bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
            disabled={loading}
          >
            {loading ? "Konto wird erstellt..." : "Konto erstellen"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Bereits ein Konto?{" "}
          <Link
            href="/login"
            className="font-medium text-[#2563EB] hover:underline"
          >
            Anmelden
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
