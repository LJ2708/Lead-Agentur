import { FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
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
            <Link href="/">Zur Startseite</Link>
          </Button>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          <span className="font-semibold text-primary">Lead</span>
          <span className="font-semibold text-foreground">Solution</span>
        </p>
      </div>
    </div>
  )
}
