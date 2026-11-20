import { DAY_NAMES, type Chore } from "../../../shared/types";

export function parseDate(s: string): Date {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
}

export function toDateString(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDays(s: string, n: number): string {
    const d = parseDate(s);
    d.setDate(d.getDate() + n);
    return toDateString(d);
}

export function friendlyDate(date: string, today: string): string {
    if (date === today) return "Today";
    if (date === addDays(today, 1)) return "Tomorrow";
    if (date === addDays(today, -1)) return "Yesterday";
    return parseDate(date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function friendlyTime(time: string | null): string | null {
    if (!time) return null;
    const [h, m] = time.split(":").map(Number);
    return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function describeSchedule(chore: Chore): string {
    switch (chore.recurrence) {
        case "once":
            return chore.dueDate ? `Once · ${parseDate(chore.dueDate).toLocaleDateString()}` : "Once";
        case "daily":
            return "Every day";
        case "weekly":
            if (chore.daysOfWeek.length === 7) return "Every day";
            if (chore.daysOfWeek.join() === "1,2,3,4,5") return "Weekdays";
            if (chore.daysOfWeek.join() === "0,6") return "Weekends";
            return chore.daysOfWeek.map((d) => DAY_NAMES[d]).join(", ");
    }
}

export function greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
}
