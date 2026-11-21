import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

// Loads JSON from the API and exposes a reload function.
export function useLoad<T>(url: string) {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        try {
            setData(await api.get<T>(url));
            setError(null);
        } catch (e) {
            setError((e as Error).message);
        }
    }, [url]);

    useEffect(() => {
        void reload();
    }, [reload]);

    return { data, setData, error, reload };
}
