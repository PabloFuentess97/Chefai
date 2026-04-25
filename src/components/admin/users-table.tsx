"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { setUserRoleAction } from "@/actions/admin";

type Row = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: Date;
  emailVerifiedAt: Date | null;
};

export function UsersTable({ users }: { users: Row[] }) {
  const router = useRouter();

  function changeRole(userId: string, role: Role) {
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("role", role);
    setUserRoleAction(null, fd).then((res) => {
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Rol actualizado");
      router.refresh();
    });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>Verificado</TableHead>
          <TableHead>Alta</TableHead>
          <TableHead className="text-right">Rol</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.id}>
            <TableCell className="font-medium truncate max-w-[260px]">
              {u.email}
            </TableCell>
            <TableCell>{u.name ?? "—"}</TableCell>
            <TableCell>
              {u.emailVerifiedAt ? (
                <span className="text-primary">Sí</span>
              ) : (
                <span className="text-muted-foreground">No</span>
              )}
            </TableCell>
            <TableCell>
              {new Intl.DateTimeFormat("es-ES").format(u.createdAt)}
            </TableCell>
            <TableCell className="text-right">
              <Select
                value={u.role}
                onValueChange={(v) => v && changeRole(u.id, v as Role)}
              >
                <SelectTrigger className="w-32 ml-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">USER</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
