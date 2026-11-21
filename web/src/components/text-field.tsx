import { useId, useState, type InputHTMLAttributes } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

type FieldState = "neutral" | "valid" | "invalid";

// A labelled input that shows whether its value is acceptable.
// Valid and invalid states each get an icon as well as a coloured outline, so they can't be
// confused with the user's accent colour (which may itself be green or red).
export function TextField({
    id,
    label,
    value,
    onChange,
    error,
    inputClassName = "",
    ...rest
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    // Message to show when the value isn't acceptable; null when it's fine.
    error: string | null;
    inputClassName?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "value" | "onChange">) {
    const tooltipId = useId();
    const [focused, setFocused] = useState(false);
    const [touched, setTouched] = useState(false);

    const engaged = focused || touched;
    const state: FieldState = !engaged ? "neutral" : error ? "invalid" : value !== "" ? "valid" : "neutral";
    const showTooltip = focused && state === "invalid";

    return (
        <div>
            <label className="label" htmlFor={id}>
                {label}
            </label>
            <div className="relative inline-block w-full">
                <input
                    {...rest}
                    id={id}
                    value={value}
                    data-state={state}
                    aria-invalid={state === "invalid"}
                    aria-describedby={state === "invalid" ? tooltipId : undefined}
                    className={`input pr-10 ${inputClassName}`}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={(e) => {
                        setFocused(true);
                        rest.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setFocused(false);
                        setTouched(true);
                        rest.onBlur?.(e);
                    }}
                />
                {state !== "neutral" && (
                    <span
                        className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${
                            state === "valid" ? "text-success" : "text-danger"
                        }`}
                        aria-hidden="true"
                    >
                        {state === "valid" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    </span>
                )}
                {state === "invalid" && (
                    <span id={tooltipId} role="tooltip" className={`field-tooltip ${showTooltip ? "" : "sr-only"}`}>
                        {error}
                    </span>
                )}
            </div>
        </div>
    );
}
