import { useId, useState, type InputHTMLAttributes } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

type FieldState = "neutral" | "valid" | "invalid";

type SharedProps = {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    // Message to show when the value isn't acceptable; null when it's fine.
    error: string | null;
    inputClassName?: string;
    // Eager mode (quiet=false): a focused field shows its error straight away. Used for Name
    // and PIN, which were asked to warn as soon as they're selected while blank.
    // Quiet mode (default): valid input turns green straight away, but errors only show once the
    // field has been left, or once `showErrors` is set by a submit attempt.
    quiet?: boolean;
    showErrors?: boolean;
    // Shows "(optional)" after the label. An empty optional field stays neutral.
    optional?: boolean;
    // Keeps the label for screen readers but doesn't draw it (e.g. next to preset buttons).
    hideLabel?: boolean;
};

type Props = SharedProps & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "value" | "onChange">;

// A labelled field that shows whether its value is acceptable.
// Valid and invalid states each get an icon as well as a coloured outline, so they can't be
// confused with the user's accent colour (which may itself be green or red).
export function TextField(props: Props) {
    const {
        id,
        label,
        value,
        onChange,
        error,
        inputClassName = "",
        quiet = true,
        showErrors = false,
        optional = false,
        hideLabel = false,
        ...rest
    } = props;
    const tooltipId = useId();
    const [focused, setFocused] = useState(false);
    const [touched, setTouched] = useState(false);

    const errorVisible = quiet ? touched || showErrors : focused || touched || showErrors;
    const validVisible = quiet || focused || touched;
    const state: FieldState = error ? (errorVisible ? "invalid" : "neutral") : value !== "" && validVisible ? "valid" : "neutral";
    const showTooltip = focused && state === "invalid";

    const shared = {
        id,
        value,
        "data-state": state,
        // Lets a form jump to the first problem when submitted too early, even before it's shown.
        "data-error": error ? "true" : undefined,
        "aria-invalid": state === "invalid",
        "aria-describedby": state === "invalid" ? tooltipId : undefined,
        className: `input pr-10 ${inputClassName}`,
        onFocus: () => setFocused(true),
        onBlur: () => {
            setFocused(false);
            setTouched(true);
        },
    };

    return (
        <div>
            <label className={hideLabel ? "sr-only" : "label"} htmlFor={id}>
                {label}
                {optional && <span className="font-normal"> (optional)</span>}
            </label>
            <div className="relative w-full">
                <input {...rest} {...shared} onChange={(e) => onChange(e.target.value)} />
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

// The same red/green treatment for a group of buttons (e.g. "pick at least one day").
export function GroupError({ error, show }: { error: string | null; show: boolean }) {
    if (!error || !show) return null;
    return (
        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-danger" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            {error}
        </p>
    );
}
