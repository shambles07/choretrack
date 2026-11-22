// Client-side checks that mirror the server's rules, for instant feedback while typing.
// Each returns an error message, or null when the value is fine.

export function nameError(name: string): string | null {
    return name.trim() === "" ? "Name cannot be blank!" : null;
}

// An empty PIN is fine when editing someone, because it means "keep the current PIN".
export function pinError(pin: string, required: boolean): string | null {
    if (pin === "" && !required) return null;
    return /^\d{4}$/.test(pin) ? null : "PIN must be exactly 4 digits";
}

export function requiredError(value: string, what: string): string | null {
    return value.trim() === "" ? `${what} can't be blank` : null;
}

export function usernameError(username: string): string | null {
    const v = username.trim();
    if (v === "") return "Pick a username";
    if (v.length < 2) return "At least 2 characters";
    return /^[a-zA-Z0-9._-]+$/.test(v) ? null : "Letters, numbers, . _ and - only";
}

// An empty password is fine when editing someone, because it means "keep the current one".
export function passwordError(password: string, required = true): string | null {
    if (password === "") return required ? "Enter a password" : null;
    return password.length < 8 ? "At least 8 characters" : null;
}

export function confirmError(password: string, confirm: string): string | null {
    if (confirm === "") return "Type the password again";
    return confirm === password ? null : "Passwords don't match";
}

export function wholeNumberError(raw: string, min: number, max: number, what: string): string | null {
    if (raw.trim() === "") return `Enter ${what}`;
    if (!/^\d+$/.test(raw.trim())) return "Whole numbers only";
    const n = Number(raw);
    return n < min || n > max ? `Between ${min} and ${max.toLocaleString()}` : null;
}
