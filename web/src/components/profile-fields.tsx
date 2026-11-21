import { AVATAR_ICON_KEYS, IconTile } from "../lib/icons";
import { nameError } from "../lib/validation";
import { ColorPicker, IconPicker } from "./pickers";
import { TextField } from "./text-field";

export interface ProfileValues {
    name: string;
    avatar: string;
    color: string;
}

// Name, avatar and favourite colour, with a live preview of the avatar.
export function ProfileFields({
    values,
    onChange,
    idPrefix,
}: {
    values: ProfileValues;
    onChange: (values: ProfileValues) => void;
    idPrefix: string;
}) {
    return (
        <>
            <div className="flex items-end gap-4">
                <IconTile name={values.avatar} color={values.color} size={64} solid rounded="rounded-3xl" />
                <div className="flex-1">
                    <TextField
                        id={`${idPrefix}-name`}
                        label="Name"
                        maxLength={60}
                        autoComplete="off"
                        value={values.name}
                        onChange={(name) => onChange({ ...values, name })}
                        error={nameError(values.name)}
                    />
                </div>
            </div>
            <IconPicker
                label="Avatar"
                icons={AVATAR_ICON_KEYS}
                value={values.avatar}
                color={values.color}
                onChange={(avatar) => onChange({ ...values, avatar })}
            />
            <ColorPicker
                value={values.color}
                onChange={(color) => onChange({ ...values, color })}
                label="Favourite colour (also used for buttons and highlights)"
            />
        </>
    );
}
