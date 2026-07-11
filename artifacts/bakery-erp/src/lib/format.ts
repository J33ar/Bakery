import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ar } from "date-fns/locale";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ar-JO", {
    style: "currency",
    currency: "JOD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  try {
    return format(parseISO(dateString), "dd MMMM yyyy", { locale: ar });
  } catch (e) {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  try {
    return format(parseISO(dateString), "dd MMMM yyyy, hh:mm a", { locale: ar });
  } catch (e) {
    return dateString;
  }
}

export function formatTime(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  try {
    // Handling HH:mm format vs ISO format
    if (dateString.includes('T')) {
      return format(parseISO(dateString), "hh:mm a", { locale: ar });
    }
    const [hours, minutes] = dateString.split(':');
    const d = new Date();
    d.setHours(parseInt(hours, 10));
    d.setMinutes(parseInt(minutes, 10));
    return format(d, "hh:mm a", { locale: ar });
  } catch (e) {
    return dateString;
  }
}

export function formatRelative(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  try {
    return formatDistanceToNow(parseISO(dateString), { addSuffix: true, locale: ar });
  } catch (e) {
    return dateString;
  }
}

export function formatMinutesAsHours(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "-";
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  if (h === 0) return `${m} دقيقة`;
  if (m === 0) return `${h} ساعة`;
  return `${h} س و ${m} د`;
}
