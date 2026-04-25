"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  max?: number;
  className?: string;
  ariaLabel?: string;
};

export function ChipsInput({
  name,
  values,
  onChange,
  placeholder,
  max = 30,
  className,
  ariaLabel,
}: Props) {
  const [draft, setDraft] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  function add(raw: string) {
    const v = raw.trim();
    if (!v) return;
    if (values.includes(v)) return;
    if (values.length >= max) return;
    onChange([...values, v]);
    setDraft("");
  }

  function remove(idx: number) {
    onChange(values.filter((_, i) => i !== idx));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && values.length > 0) {
      remove(values.length - 1);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5 min-h-10 rounded-lg border bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring",
        className
      )}
      onClick={() => inputRef.current?.focus()}
      role="list"
      aria-label={ariaLabel}
    >
      {values.map((v, i) => (
        <span
          key={`${v}-${i}`}
          role="listitem"
          className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-0.5 text-sm"
        >
          {v}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              remove(i);
            }}
            className="hover:bg-primary/20 rounded p-0.5"
            aria-label={`Quitar ${v}`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => draft && add(draft)}
        placeholder={values.length === 0 ? placeholder : undefined}
        className="flex-1 min-w-[100px] bg-transparent outline-none text-sm py-1"
      />
      <input type="hidden" name={name} value={values.join(",")} />
    </div>
  );
}
