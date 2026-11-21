// Command-line recovery for a forgotten parent password:
//   npm run reset-admin-password -- <username> <new-password>
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase } from "./db.js";
import { destroyUserSessions, hashSecret } from "./auth.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(process.env.DATA_DIR ?? path.join(here, "../../data"));
const [username, password] = process.argv.slice(2);

if (!username || !password || password.length < 8) {
    console.error("Usage: npm run reset-admin-password -- <username> <new-password (8+ characters)>");
    process.exit(1);
}

const db = openDatabase(path.join(dataDir, "choretrack.db"));
const user = db.prepare("SELECT id FROM users WHERE username = ? AND role = 'admin'").get(username) as
    | { id: number }
    | undefined;
if (!user) {
    console.error(`No parent account named "${username}".`);
    process.exit(1);
}
db.prepare("UPDATE users SET password_hash = ?, active = 1 WHERE id = ?").run(await hashSecret(password), user.id);
destroyUserSessions(db, user.id);
console.log(`Password for "${username}" has been reset.`);
db.close();
