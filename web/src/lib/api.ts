export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
    const res = await fetch(`/api${url}`, {
        method,
        credentials: "same-origin",
        headers: method === "GET" ? {} : { "content-type": "application/json" },
        body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new ApiError(res.status, data.error ?? "Something went wrong.");
    }
    return data as T;
}

export const api = {
    get: <T>(url: string) => request<T>("GET", url),
    post: <T>(url: string, body?: unknown) => request<T>("POST", url, body),
    put: <T>(url: string, body?: unknown) => request<T>("PUT", url, body),
    patch: <T>(url: string, body?: unknown) => request<T>("PATCH", url, body),
    del: <T>(url: string) => request<T>("DELETE", url),
};
