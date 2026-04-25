import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-svh grid place-items-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <p className="text-sm text-muted-foreground">404</p>
        <h1 className="text-3xl font-bold">No hemos encontrado esta página</h1>
        <p className="text-muted-foreground">
          Quizá fue eliminada o el enlace ya no existe.
        </p>
        <div className="flex gap-2 justify-center">
          <Button render={<Link href="/" />}>Volver a inicio</Button>
          <Button variant="outline" render={<Link href="/dashboard" />}>
            Ir al panel
          </Button>
        </div>
      </div>
    </div>
  );
}
