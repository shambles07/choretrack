import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { nameError } from "../lib/validation";
import { Modal } from "./modal";
import { ProfileFields, type ProfileValues } from "./profile-fields";
import { useToast } from "./toast";
import { FormHint, SubmitButton, useFormFlow } from "./form-kit";
import type { PublicUser } from "../../../shared/types";

// Lets whoever is signed in change their own name, avatar and colour.
export function ProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { user, setUser } = useAuth();
    const notify = useToast();
    const [values, setValues] = useState<ProfileValues>({ name: "", avatar: "star", color: "#6366f1" });
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open && user) setValues({ name: user.name, avatar: user.avatar, color: user.color });
    }, [open, user]);

    const ready = nameError(values.name) === null;

    const { formId, tried, formProps } = useFormFlow({
        ready,
        onSubmit: async () => {
            setBusy(true);
            try {
                const res = await api.patch<{ user: PublicUser }>("/me", { ...values, name: values.name.trim() });
                setUser(res.user);
                notify("Profile updated", { tone: "success" });
                onClose();
            } catch (e) {
                notify((e as Error).message, { tone: "error" });
            } finally {
                setBusy(false);
            }
        },
    });

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="My profile"
            footer={
                <>
                    <FormHint ready={ready} action="save" escape="closes" className="mr-auto hidden sm:block" />
                    <button className="btn btn-ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <SubmitButton formId={formId} ready={ready} busy={busy}>
                        Save
                    </SubmitButton>
                </>
            }
        >
            <form className="space-y-5" {...formProps}>
                <ProfileFields idPrefix="me" values={values} onChange={setValues} showErrors={tried} />
            </form>
        </Modal>
    );
}
