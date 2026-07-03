"use client"

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerPopoverProps {
  value?: string; // ISO date string (YYYY-MM-DD)
  onChange: (date: string | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePickerPopover({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  disabled,
}: DatePickerPopoverProps) {
  const [open, setOpen] = React.useState(false);

  const date = value ? new Date(value + "T00:00:00") : undefined;
  const isInvalid = value && isNaN(new Date(value + "T00:00:00").getTime());

  const handleSelect = (selected: Date | undefined) => {
    if (selected) {
      const year = selected.getFullYear();
      const month = String(selected.getMonth() + 1).padStart(2, "0");
      const day = String(selected.getDate()).padStart(2, "0");
      onChange(`${year}-${month}-${day}`);
    } else {
      onChange(undefined);
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "w-full justify-start gap-2 text-left font-normal",
            !date && "text-muted-foreground",
            isInvalid && "text-destructive border-destructive",
            className
          )}
        >
          <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
          {date && !isInvalid ? (
            <span className="tabular-nums">
              {format(date, "MMM d, yyyy")}
            </span>
          ) : value && !isInvalid ? (
            <span className="tabular-nums">{value}</span>
          ) : (
            <span>{placeholder}</span>
          )}
          {date && (
            <button
              onClick={handleClear}
              className="ml-auto rounded p-0.5 text-muted-foreground/50 hover:text-foreground"
              tabIndex={-1}
            >
              ✕
            </button>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
