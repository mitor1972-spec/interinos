import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Despacho = Database["public"]["Tables"]["despachos"]["Row"];
export type Abogado = Database["public"]["Tables"]["abogados"]["Row"];
export type ProvinciaAbogado = Database["public"]["Tables"]["provincia_abogado"]["Row"];

export interface AbogadoConDespacho extends Abogado {
  despachos?: { nombre: string } | null;
}

export async function listarDespachos(): Promise<Despacho[]> {
  const { data, error } = await supabase
    .from("despachos")
    .select("*")
    .order("nombre", { ascending: true });
  if (error) {
    console.error("Error listando despachos:", error);
    return [];
  }
  return (data ?? []) as Despacho[];
}

export async function listarAbogados(): Promise<AbogadoConDespacho[]> {
  const { data, error } = await supabase
    .from("abogados")
    .select("*, despachos(nombre)")
    .order("nombre", { ascending: true });
  if (error) {
    console.error("Error listando abogados:", error);
    return [];
  }
  return (data ?? []) as AbogadoConDespacho[];
}

export async function listarMapeoProvincias(): Promise<
  (ProvinciaAbogado & { abogados?: { nombre: string } | null })[]
> {
  const { data, error } = await supabase
    .from("provincia_abogado")
    .select("*, abogados(nombre)")
    .order("provincia", { ascending: true });
  if (error) {
    console.error("Error listando provincias:", error);
    return [];
  }
  return (data ?? []) as never;
}

/** Devuelve un mapa { abogadoId: { nombre, despacho } } útil para tablas. */
export async function mapaAbogados(): Promise<Map<string, AbogadoConDespacho>> {
  const list = await listarAbogados();
  return new Map(list.map((a) => [a.id, a]));
}
