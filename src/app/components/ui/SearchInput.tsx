"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input, type InputProps } from "./Input";

export interface SearchInputProps extends Omit<InputProps, "leftIcon" | "rightIcon"> {
  onClear?: () => void;
}

export function SearchInput({ value, onChange, onClear, placeholder = "Search...", ...props }: SearchInputProps) {
  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      const event = {
        target: { value: "" },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(event);
    }
  };

  return (
    <Input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      leftIcon={<Search size={16} />}
      rightIcon={
        value ? (
          <button
            type="button"
            onClick={handleClear}
            className="hover:text-[#1e1e1e] cursor-pointer focus:outline-none"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        ) : undefined
      }
      {...props}
    />
  );
}
