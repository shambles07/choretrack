import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

// The "c", "r" and "a" shortcuts navigate to a page with ?new=1. Once the page has its data,
// this opens the page's "new" form and removes the parameter, so reloading doesn't reopen it.
export function useNewParam(ready: boolean, open: () => void): void {
    const [params, setParams] = useSearchParams();
    const wanted = params.get("new") === "1";

    useEffect(() => {
        if (!wanted || !ready) return;
        const next = new URLSearchParams(params);
        next.delete("new");
        setParams(next, { replace: true });
        open();
        // `open` is recreated each render; running once per request is what matters here.
    }, [wanted, ready]);
}
