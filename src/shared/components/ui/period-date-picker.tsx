import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";
import { cn } from "@/shared/utils/cn";

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

type Period = "day" | "month" | "year";

type PeriodDatePickerProps = {
  period: Period;
  value: Date;
  onChange: (date: Date) => void;
};

export function PeriodDatePicker({ period, value, onChange }: PeriodDatePickerProps) {
  const [open, setOpen] = useState(false);

  if (period === "year") {
    const currentYear = value.getFullYear();
    const years = Array.from({ length: 11 }, (_, i) => 2020 + i);
    return (
      <div className="flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-bold">
        <CalendarIcon className="size-4 text-muted-foreground" />
        <select
          className="bg-transparent outline-none"
          value={currentYear}
          onChange={(e) => {
            const d = new Date(value);
            d.setFullYear(Number(e.target.value));
            onChange(d);
          }}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const label =
    period === "day"
      ? value.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      : `${MONTHS[value.getMonth()]} ${value.getFullYear()}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("h-9 gap-2 rounded-full px-4 text-sm font-bold")}>
          <CalendarIcon className="size-4 text-muted-foreground" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {period === "day" ? (
          <Calendar
            mode="single"
            selected={value}
            onSelect={(d) => {
              if (d) {
                onChange(d);
                setOpen(false);
              }
            }}
            initialFocus
          />
        ) : (
          <Calendar
            mode="single"
            selected={value}
            onSelect={(d) => {
              if (d) {
                onChange(d);
                setOpen(false);
              }
            }}
            captionLayout="dropdown"
            startMonth={new Date(2020, 0)}
            endMonth={new Date(2030, 11)}
            initialFocus
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
