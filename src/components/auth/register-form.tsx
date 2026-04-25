"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { registerAction } from "@/actions/auth";

export function RegisterForm({ next = "/dashboard" }: { next?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    setFieldError(null);
    setErrorField(null);
    startTransition(async () => {
      const res = await registerAction(null, formData);
      if (!res.ok) {
        setError(res.error.message);
        if (res.error.field) {
          setErrorField(res.error.field);
          setFieldError(res.error.message);
        }
        return;
      }
      router.push(next);
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          placeholder="Tu nombre"
          aria-invalid={errorField === "name"}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tucorreo@ejemplo.com"
          aria-invalid={errorField === "email"}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 10 caracteres con letra y número"
          minLength={10}
          aria-invalid={errorField === "password"}
          required
        />
        <p className="text-xs text-muted-foreground">
          Al menos 10 caracteres con una letra y un número.
        </p>
      </div>

      {error && !fieldError && (
        <Alert variant="default">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creando cuenta…" : "Crear cuenta gratis"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
