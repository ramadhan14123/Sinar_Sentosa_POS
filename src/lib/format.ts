export const formatIDR = (value: number) => new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format(value);

export const formatDateTime = (value: string) => new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(value));