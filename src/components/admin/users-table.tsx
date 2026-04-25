"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Role } from "@prisma/client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Row = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: Date;
  emailVerifiedAt: Date | null;
  planName: string;
};

const dateFmt = new Intl.DateTimeFormat("es-ES");

export function UsersTable({ users }: { users: Row[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Usuario</TableHead>
          <TableHead className="hidden sm:table-cell">Plan</TableHead>
          <TableHead className="hidden md:table-cell">Rol</TableHead>
          <TableHead className="hidden md:table-cell">Verificado</TableHead>
          <TableHead className="hidden lg:table-cell">Alta</TableHead>
          <TableHead className="text-right" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow
            key={u.id}
            className="cursor-pointer hover:bg-muted/40"
          >
            <TableCell className="font-medium">
              <Link href={`/admin/users/${u.id}`} className="block">
                <div className="flex flex-col gap-0.5">
                  <span className="truncate max-w-[260px]">{u.email}</span>
                  {u.name && (
                    <span className="text-xs text-muted-foreground truncate max-w-[260px]">
                      {u.name}
                    </span>
                  )}
                </div>
              </Link>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <Badge variant="outline">{u.planName}</Badge>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <Badge variant={u.role === "ADMIN" ? "default" : "outline"}>
                {u.role}
              </Badge>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {u.emailVerifiedAt ? (
                <span className="text-primary text-sm">Sí</span>
              ) : (
                <span className="text-muted-foreground text-sm">No</span>
              )}
            </TableCell>
            <TableCell className="hidden lg:table-cell text-sm">
              {dateFmt.format(u.createdAt)}
            </TableCell>
            <TableCell className="text-right">
              <Link
                href={`/admin/users/${u.id}`}
                className="inline-flex items-center gap-1 text-primary text-sm hover:underline"
                aria-label={`Editar ${u.email}`}
              >
                Editar
                <ArrowRight className="size-3.5" />
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
