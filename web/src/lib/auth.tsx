import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import { setSoundEnabled } from "./sound";
import type { PublicUser } from "../../../shared/types";

interface AuthState {
    user: PublicUser | null;
    loading: boolean;
    needsSetup: boolean;
    setUser: (u: PublicUser | null) => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUserState] = useState<PublicUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [needsSetup, setNeedsSetup] = useState(false);

    const setUser = useCallback((u: PublicUser | null) => {
        setUserState(u);
        setSoundEnabled(u?.soundEnabled ?? true);
        if (u) setNeedsSetup(false);
    }, []);

    useEffect(() => {
        Promise.all([api.get<{ user: PublicUser | null }>("/auth/me"), api.get<{ needsSetup: boolean }>("/setup")])
            .then(([me, setup]) => {
                setUser(me.user);
                setNeedsSetup(setup.needsSetup);
            })
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, [setUser]);

    const logout = useCallback(async () => {
        await api.post("/auth/logout").catch(() => undefined);
        setUser(null);
    }, [setUser]);

    return (
        <AuthContext.Provider value={{ user, loading, needsSetup, setUser, logout }}>{children}</AuthContext.Provider>
    );
}

export function useAuth(): AuthState {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
