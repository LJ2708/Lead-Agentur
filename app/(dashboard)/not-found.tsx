import { FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function DashboardNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="h-8 w-8 text-muted-foreground" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Seite nicht gefunden
        </h1>
        <p className="mt-2 text-muted-foreground">
          Die angeforderte Seite existiert nicht.
        </p>

        <div className="mt-6">
          <Button asChild>
            <Link href="/berater">Zurück zum Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
