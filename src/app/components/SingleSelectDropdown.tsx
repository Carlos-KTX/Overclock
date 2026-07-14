"use client";

import { useEffect, useRef, useState } from "react";

interface Option {
  label: string;
  value: string;
}

interface SingleSelectDropdownProps {
  label: string;
  options: Option[];
  selected: string;
  onChange: (next: string) => void;
  /** Value that counts as "no filter applied" - suppresses the active-state styling/badge. */
  defaultValue: string;
}

export function SingleSelectDropdown({ label, options, selected, onChange, defaultValue }: SingleSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isActive = selected !== defaultValue;
  const selectedLabel = options.find((o) => o.value === selected)?.label ?? label;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-sm border px-3 py-1.5 text-sm font-medium transition-colors ${
          isActive
            ? "border-slate-600 bg-slate-800 text-white"
            : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
        }`}
      >
        {isActive ? selectedLabel : label}
        <svg width="10" height="10" viewBox="0 0 10 10" className="opacity-70">
          <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-sm border border-slate-300 bg-white shadow-lg">
          <div className="border-b border-slate-200 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
          </div>
          <div className="py-1">
            {options.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="radio"
                  name={label}
                  checked={selected === option.value}
                  onChange={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="border-slate-300"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
