import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InvitarSchema = z.object({
  nombre: z.string().min(2).max(200),
  email: z.string().email().max(255),
  rol: z.enum(["admin", "lawyer", "perito"]),
  telefono: z.string().max(30).optional().nullable(),
  despacho_id: z.string().uuid().optional().nullable(),
  provincias: z.array(z.string().min(2).max(100)).max(60).optional().default([]),
});

export const invitarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InvitarSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase: userClient, userId } = context;

    // Verificar que quien invita es admin.
    const { data: roles, error: rolesErr } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (rolesErr) throw new Error(rolesErr.message);
    if (!roles?.some((r) => r.role === "admin")) {
      throw new Error("Solo administradores pueden invitar usuarios");
    }

    // Crear usuario sin contraseña: enviar email de recovery para que la fije.
    // Si ya existe el usuario, se reutiliza.
    let newUserId: string | null = null;

    // 1) Comprobar si ya existe.
    const { data: existing, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw new Error(listErr.message);
    const found = existing.users.find(
      (u) => (u.email ?? "").toLowerCase() === data.email.toLowerCase(),
    );

    if (found) {
      newUserId = found.id;
    } else {
      // Crear usuario con contraseña temporal aleatoria (no se comunica al
      // admin; el invitado deberá usar "olvidé mi contraseña").
      const tempPassword =
        crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "").slice(0, 8) + "!Aa1";
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: data.nombre },
      });
      if (createErr) throw new Error(createErr.message);
      newUserId = created.user?.id ?? null;
    }

    if (!newUserId) throw new Error("No se pudo crear el usuario");

    // 2) Asignar rol (idempotente).
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: newUserId, role: data.rol }, { onConflict: "user_id,role" });
    if (roleErr) throw new Error("Error asignando rol: " + roleErr.message);

    // 3) Si es abogado, crear / actualizar registro en `abogados`.
    let abogadoId: string | null = null;
    if (data.rol === "lawyer") {
      // ¿Ya existe un abogado con ese email?
      const { data: existingAbogado } = await supabaseAdmin
        .from("abogados")
        .select("id")
        .eq("email", data.email)
        .maybeSingle();

      if (existingAbogado) {
        abogadoId = existingAbogado.id;
        await supabaseAdmin
          .from("abogados")
          .update({
            user_id: newUserId,
            nombre: data.nombre,
            telefono: data.telefono ?? null,
            despacho_id: data.despacho_id ?? null,
            activo: true,
          })
          .eq("id", abogadoId);
      } else {
        const { data: ins, error: insErr } = await supabaseAdmin
          .from("abogados")
          .insert({
            user_id: newUserId,
            nombre: data.nombre,
            email: data.email,
            telefono: data.telefono ?? null,
            despacho_id: data.despacho_id ?? null,
            activo: true,
          })
          .select("id")
          .single();
        if (insErr) throw new Error("Error creando abogado: " + insErr.message);
        abogadoId = ins.id;
      }

      // 4) Provincias gestionadas → tabla provincia_abogado.
      if (abogadoId && data.provincias.length > 0) {
        const rows = data.provincias.map((p) => ({
          abogado_id: abogadoId!,
          provincia: p.trim(),
        }));
        await supabaseAdmin.from("provincia_abogado").insert(rows);
      }
    }

    return {
      ok: true,
      user_id: newUserId,
      abogado_id: abogadoId,
      reused_existing: !!found,
    };
  });
