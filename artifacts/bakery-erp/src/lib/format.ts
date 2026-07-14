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
    // نأخذ الوقت مباشرة من الـ string بدون تحويل timezone
    let timePart: string;
    if (dateString.includes("T")) {
      // ISO: "2026-07-15T08:00:00.000Z" → نأخذ "08:00"
      timePart = dateString.split("T")[1]!.slice(0, 5);
    } else {
      // "HH:mm:ss" أو "HH:mm"
      timePart = dateString.slice(0, 5);
    }
    const [h, m] = timePart.split(":").map(Number);
    const d = new Date();
    d.setHours(h ?? 0, m ?? 0, 0, 0);
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
