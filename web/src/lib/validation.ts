// Client-side checks that mirror the server's rules, for instant feedback while typing.

export function nameError(name: string): string | null {
    return name.trim() === "" ? "Name cannot be blank!" : null;
}

// An empty PIN is fine when editing someone, because it means "keep the current PIN".
export function pinError(pin: string, required: boolean): string | null {
    if (pin === "" && !required) return null;
    return /^\d{4}$/.test(pin) ? null : "PIN must be exactly 4 digits";
}
