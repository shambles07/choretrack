import { parseArgs } from "node:util";

export const EXPORT_SCOPES = ["chores", "users", "scores", "all"] as const;
export type ExportScope = (typeof EXPORT_SCOPES)[number];

export type CliCommand =
    | { kind: "serve"; port: number }
    | { kind: "export"; scope: ExportScope }
    | { kind: "usage" }
    | { kind: "version" }
    | { kind: "error"; message: string };

export const DEFAULT_PORT = 3030;

export function usageText(version: string): string {
    return `ChoreTrack ${version}: a stupid simple family chore tracker.

Usage:
  choretrack [options]

Options:
  -p, --port <number>    Port to listen on (default: $PORT or ${DEFAULT_PORT})
  -x, --export <what>    Print data as JSON to stdout and exit, instead of starting
                         the server. <what> is one of: chores, users, scores, all
  -v, --version          Print the version and exit
  -h, --usage, --help    Print this help and exit

Values can follow a space or an equals sign: -p 8080, -p=8080, --port=8080.

Environment:
  PORT           Port to listen on (overridden by --port)
  HOST           Interface to bind to (default: 0.0.0.0)
  DATA_DIR       Folder holding choretrack.db (default: ./data)
  TZ             Time zone that decides when "today" starts
  COOKIE_SECURE  Set to "true" when served over HTTPS

Examples:
  choretrack --port 8080
  choretrack --export=all > choretrack-backup.json
  choretrack -x scores
`;
}

// Short options written as "-x=all" arrive from parseArgs as "=all".
function clean(value: string): string {
    return value.startsWith("=") ? value.slice(1) : value;
}

function normaliseScope(raw: string): ExportScope | null {
    const value = clean(raw).trim().toLowerCase();
    const aliases: Record<string, ExportScope> = { score: "scores", chore: "chores", user: "users", everything: "all" };
    const scope = aliases[value] ?? value;
    return (EXPORT_SCOPES as readonly string[]).includes(scope) ? (scope as ExportScope) : null;
}

export function parsePort(raw: string): number | null {
    const value = clean(raw).trim();
    if (!/^\d+$/.test(value)) return null;
    const port = Number(value);
    return port >= 1 && port <= 65535 ? port : null;
}

export function parseCli(argv: string[], env: NodeJS.ProcessEnv = process.env): CliCommand {
    let values: { usage?: boolean; help?: boolean; version?: boolean; port?: string; export?: string };
    try {
        ({ values } = parseArgs({
            args: argv,
            strict: true,
            allowPositionals: false,
            options: {
                usage: { type: "boolean", short: "h" },
                help: { type: "boolean" },
                version: { type: "boolean", short: "v" },
                port: { type: "string", short: "p" },
                export: { type: "string", short: "x" },
            },
        }));
    } catch (e) {
        const err = e as Error & { code?: string };
        if (err.code === "ERR_PARSE_ARGS_INVALID_OPTION_VALUE") {
            return { kind: "error", message: `${err.message.replace(/^Option '([^']+)'.*$/, "Option '$1' needs a value.")}` };
        }
        return { kind: "error", message: err.message };
    }

    if (values.usage || values.help) return { kind: "usage" };
    if (values.version) return { kind: "version" };

    if (values.export !== undefined) {
        const scope = normaliseScope(values.export);
        if (!scope) {
            return { kind: "error", message: `Unknown export "${clean(values.export)}". Use one of: ${EXPORT_SCOPES.join(", ")}.` };
        }
        return { kind: "export", scope };
    }

    const rawPort = values.port ?? env.PORT;
    if (rawPort === undefined || rawPort === "") return { kind: "serve", port: DEFAULT_PORT };
    const port = parsePort(rawPort);
    if (port === null) {
        const source = values.port !== undefined ? "--port" : "PORT";
        return { kind: "error", message: `${source} must be a number from 1 to 65535 (got "${clean(rawPort)}").` };
    }
    return { kind: "serve", port };
}
