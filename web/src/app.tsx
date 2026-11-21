import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { ToastProvider } from "./components/toast";
import { AppShell } from "./components/app-shell";
import { LoginPage } from "./pages/login-page";
import { SetupPage } from "./pages/setup-page";
import { DoerHomePage } from "./pages/doer/home-page";
import { DoerRewardsPage } from "./pages/doer/rewards-page";
import { DoerTrophiesPage } from "./pages/doer/trophies-page";
import { AdminOverviewPage } from "./pages/admin/overview-page";
import { AdminChoresPage } from "./pages/admin/chores-page";
import { AdminHistoryPage } from "./pages/admin/history-page";
import { AdminPeoplePage } from "./pages/admin/people-page";
import { AdminRewardsPage } from "./pages/admin/rewards-page";
import { AdminCategoriesPage } from "./pages/admin/categories-page";
import { AdminAccountPage, AdminMorePage } from "./pages/admin/account-page";
import type { Role } from "../../shared/types";

function Guard({ role, children }: { role: Role; children: ReactNode }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (user.role !== role) return <Navigate to="/" replace />;
    return <>{children}</>;
}

function Home() {
    const { user, needsSetup } = useAuth();
    if (needsSetup) return <Navigate to="/setup" replace />;
    if (!user) return <Navigate to="/login" replace />;
    return <Navigate to={user.role === "admin" ? "/admin" : "/me"} replace />;
}

function AppRoutes() {
    const { loading, user, needsSetup } = useAuth();
    if (loading) return null;
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/setup" element={needsSetup ? <SetupPage /> : <Navigate to="/" replace />} />
            <Route path="/login" element={needsSetup ? <Navigate to="/setup" replace /> : user ? <Navigate to="/" replace /> : <LoginPage />} />
            <Route
                element={
                    <Guard role="doer">
                        <AppShell />
                    </Guard>
                }
            >
                <Route path="/me" element={<DoerHomePage />} />
                <Route path="/me/rewards" element={<DoerRewardsPage />} />
                <Route path="/me/trophies" element={<DoerTrophiesPage />} />
            </Route>
            <Route
                element={
                    <Guard role="admin">
                        <AppShell />
                    </Guard>
                }
            >
                <Route path="/admin" element={<AdminOverviewPage />} />
                <Route path="/admin/chores" element={<AdminChoresPage />} />
                <Route path="/admin/history" element={<AdminHistoryPage />} />
                <Route path="/admin/people" element={<AdminPeoplePage />} />
                <Route path="/admin/rewards" element={<AdminRewardsPage />} />
                <Route path="/admin/categories" element={<AdminCategoriesPage />} />
                <Route path="/admin/account" element={<AdminAccountPage />} />
                <Route path="/admin/more" element={<AdminMorePage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ToastProvider>
                    <AppRoutes />
                </ToastProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
