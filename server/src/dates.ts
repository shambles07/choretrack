// Dates are stored as YYYY-MM-DD strings in the server's local time zone,
// which is the household's time zone (set TZ to override).

export function toDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export function parseDate(s: string): Date {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
}

export function addDays(s: string, days: number): string {
    const d = parseDate(s);
    d.setDate(d.getDate() + days);
    return toDateString(d);
}

export function dayOfWeek(s: string): number {
    return parseDate(s).getDay();
}

export function nowIso(): string {
    return new Date().toISOString();
}

let clock: () => Date = () => new Date();

// Lets tests pin "today".
export function setClock(fn: () => Date): void {
    clock = fn;
}

export function today(): string {
    return toDateString(clock());
}

export function currentHour(): number {
    return clock().getHours();
}
