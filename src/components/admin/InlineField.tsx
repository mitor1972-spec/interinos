import { useEffect, useRef, useState } from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "idle" | "saving" | "saved" | "error";

interface BaseProps {
  label: string;
  status?: Status;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
}

/** Wrapper visual con label + indicador de guardado. */
export function InlineFieldShell({
  label,
  status = "idle",
  error,
  className,
  children,
  hint,
}: BaseProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
        <SaveIndicator status={status} />
      </div>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && (
        <p className="flex items-center gap-1 text-[11px] text-destructive">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  );
}

function SaveIndicator({ status }: { status: Status }) {
  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Guardando…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success">
        <Check className="h-3 w-3" /> Guardado
      </span>
    );
  }
  return null;
}

/* ---------------- Select inline ---------------- */

interface InlineSelectProps<T extends string> {
  label: string;
  value: T | null | undefined;
  options: { value: T; label: string }[];
  onSave: (value: T | null) => Promise<void>;
  placeholder?: string;
  allowEmpty?: boolean;
  className?: string;
  hint?: React.ReactNode;
}

export function InlineSelect<T extends string>({
  label,
  value,
  options,
  onSave,
  placeholder = "Seleccionar…",
  allowEmpty = true,
  className,
  hint,
}: InlineSelectProps<T>) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = async (raw: string) => {
    const next = (raw === "" ? null : (raw as T)) as T | null;
    setStatus("saving");
    setError(null);
    try {
      await onSave(next);
      setStatus("saved");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setStatus("idle"), 1500);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Error guardando");
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <InlineFieldShell label={label} status={status} error={error} className={className} hint={hint}>
      <select
        value={value ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
      >
        {allowEmpty && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </InlineFieldShell>
  );
}

/* ---------------- Texto inline (input / textarea) con autosave debounced ---------------- */

interface InlineTextProps {
  label: string;
  value: string | null | undefined;
  onSave: (value: string | null) => Promise<void>;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  className?: string;
  type?: "text" | "date" | "number";
  hint?: React.ReactNode;
}

export function InlineText({
  label,
  value,
  onSave,
  multiline = false,
  rows = 3,
  placeholder,
  className,
  type = "text",
  hint,
}: InlineTextProps) {
  const [local, setLocal] = useState<string>(value ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>(value ?? "");
  const initialMount = useRef(true);

  useEffect(() => {
    setLocal(value ?? "");
    lastSavedRef.current = value ?? "";
    initialMount.current = true;
  }, [value]);

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (local === lastSavedRef.current) return;
      setStatus("saving");
      setError(null);
      try {
        await onSave(local.trim() === "" ? null : local);
        lastSavedRef.current = local;
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 1500);
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Error guardando");
      }
    }, 700);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  const baseInputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

  return (
    <InlineFieldShell label={label} status={status} error={error} className={className} hint={hint}>
      {multiline ? (
        <textarea
          value={local}
          rows={rows}
          placeholder={placeholder}
          onChange={(e) => setLocal(e.target.value)}
          className={cn(baseInputClass, "resize-y leading-relaxed")}
        />
      ) : (
        <input
          type={type}
          value={local}
          placeholder={placeholder}
          onChange={(e) => setLocal(e.target.value)}
          className={baseInputClass}
        />
      )}
    </InlineFieldShell>
  );
}

/* ---------------- Toggle Sí/No ---------------- */

interface InlineToggleProps {
  label: string;
  value: boolean;
  onSave: (value: boolean) => Promise<void>;
  description?: string;
  className?: string;
}

export function InlineToggle({ label, value, onSave, description, className }: InlineToggleProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState(value);

  useEffect(() => setLocal(value), [value]);

  const handleToggle = async () => {
    if (busy) return;
    setBusy(true);
    const next = !local;
    setLocal(next);
    setStatus("saving");
    try {
      await onSave(next);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1200);
    } catch {
      setLocal(!next);
      setStatus("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        <SaveIndicator status={status} />
        <button
          type="button"
          role="switch"
          aria-checked={local}
          onClick={handleToggle}
          disabled={busy}
          className={cn(
            "relative inline-flex h-6 w-11 flex-none items-center rounded-full transition",
            local ? "bg-success" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 transform rounded-full bg-background shadow transition",
              local ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
      </div>
    </div>
  );
}
