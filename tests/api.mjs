import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import net from "node:net";

const root = path.resolve(import.meta.dirname, "..");
const php = process.env.PHP_BINARY || "php";
const temp = await mkdtemp(path.join(tmpdir(), "course-api-test-"));
const mysqlDsn = process.env.TEST_DB_DSN;
if (mysqlDsn && !/dbname=course_registration_test(?:;|$)/.test(mysqlDsn))
  throw new Error("Use an isolated course_registration_test database");
const env = {
  ...process.env,
  DB_DSN: mysqlDsn || "sqlite:" + path.join(temp, "test.db"),
  DB_USER: process.env.TEST_DB_USER || "",
  DB_PASSWORD: process.env.TEST_DB_PASSWORD || "",
  FRONTEND_ORIGIN: "http://127.0.0.1:3000",
};
const execute = (code, args = [], extraEnv = {}) => {
  const result = spawnSync(php, ["-r", code, ...args], {
    cwd: root,
    env: { ...env, ...extraEnv },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
};
const schema = mysqlDsn
  ? (await readFile(path.join(root, "database/init.sql"), "utf8")).replace(
      /CREATE DATABASE[^;]+;|USE course_registration;/g,
      "",
    )
  : await readFile(path.join(root, "tests/schema.sqlite.sql"), "utf8");
execute(
  '$db=new PDO(getenv("DB_DSN"),getenv("DB_USER"),getenv("DB_PASSWORD"));$db->exec($argv[1]);',
  [schema],
);
const admin = spawnSync(php, ["backend/bin/create-admin.php"], {
  cwd: root,
  env: {
    ...env,
    ADMIN_LOGIN: "test-admin",
    ADMIN_EMAIL: "admin@example.test",
    ADMIN_PASSWORD: "TestOnly!98765",
  },
  encoding: "utf8",
});
assert.equal(admin.status, 0, admin.stderr || admin.stdout);
const listener = net.createServer();
await new Promise((resolve) => listener.listen(0, "127.0.0.1", resolve));
const port = listener.address().port;
await new Promise((resolve) => listener.close(resolve));
const base = "http://127.0.0.1:" + port;
const server = spawn(php, ["-S", "127.0.0.1:" + port, "backend/router.php"], {
  cwd: root,
  env,
  stdio: ["ignore", "ignore", "pipe"],
});
let serverLog = "";
server.stderr.on("data", (chunk) => {
  serverLog += chunk.toString();
});
class Client {
  cookie = "";
  csrf = "";
  async call(
    route,
    {
      method = "GET",
      data,
      expected = 200,
      csrf = true,
      headers = {},
      raw,
    } = {},
  ) {
    const response = await fetch(base + route, {
      method,
      headers: {
        ...(this.cookie ? { Cookie: this.cookie } : {}),
        ...(data !== undefined || raw !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...(method !== "GET" && csrf ? { "X-CSRF-Token": this.csrf } : {}),
        ...headers,
      },
      body: raw ?? (data === undefined ? undefined : JSON.stringify(data)),
    });
    const cookie = response.headers.get("set-cookie");
    if (cookie) this.cookie = cookie.split(";")[0];
    assert.equal(
      response.status,
      expected,
      route + " returned " + response.status,
    );
    const body = await response.json();
    if (body.csrfToken) this.csrf = body.csrfToken;
    return body;
  }
  async login(login, password) {
    await this.call("/api/auth.php");
    return this.call("/api/auth.php?action=login", {
      method: "POST",
      data: { login, password },
    });
  }
}
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(base + "/api/auth.php");
      ready = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  assert(ready, "PHP server failed to start");
  const user = new Client(),
    other = new Client(),
    operator = new Client();
  assert.equal((await user.call("/api/auth.php")).authenticated, false);
  await user.call("/api/applications.php", { expected: 401 });
  await user.call("/api/auth.php?action=register", {
    method: "POST",
    data: {},
    csrf: false,
    expected: 403,
  });
  await user.call("/api/auth.php?action=register", {
    method: "POST",
    raw: "{",
    expected: 400,
  });
  await user.call("/api/auth.php?action=register", {
    method: "POST",
    data: [],
    expected: 400,
  });
  await user.call("/api/auth.php?action=register", {
    method: "POST",
    data: { login: [], email: "a@example.test", password: "TestPass!123" },
    expected: 400,
  });
  await user.call("/api/auth.php?action=register", {
    method: "POST",
    data: { login: "test-user", email: "bad-email", password: "TestPass!123" },
    expected: 400,
  });
  await user.call("/api/auth.php?action=register", {
    method: "POST",
    data: { login: "test-user", email: "user@example.test", password: "short" },
    expected: 400,
  });
  await user.call("/api/auth.php?action=register", {
    method: "POST",
    data: {
      login: "test-user",
      email: "user@example.test",
      password: " TestPass!123 ",
      role: "admin",
    },
    expected: 201,
  });
  await user.call("/api/auth.php?action=register", {
    method: "POST",
    data: {
      login: "test-user",
      email: "another@example.test",
      password: "TestPass!123",
    },
    expected: 409,
  });
  await user.call("/api/auth.php?action=login", {
    method: "POST",
    data: { login: "test-user", password: "TestPass!123" },
    expected: 401,
  });
  const oldCookie = user.cookie;
  const loggedIn = await user.login("test-user", " TestPass!123 ");
  assert.equal(loggedIn.user.role, "user");
  assert(!("password_hash" in loggedIn.user));
  assert.notEqual(oldCookie, user.cookie);
  const application = await user.call("/api/applications.php", {
    method: "POST",
    data: { comment: "Course request" },
    expected: 201,
  });
  await user.call("/api/applications.php", {
    method: "POST",
    data: {},
    expected: 409,
  });
  await user.call("/api/applications.php", {
    method: "PATCH",
    data: { id: application.application_id, status: "approved" },
    expected: 403,
  });
  await other.call("/api/auth.php");
  await other.call("/api/auth.php?action=register", {
    method: "POST",
    data: {
      login: "other-user",
      email: "other@example.test",
      password: "OtherPass!123",
    },
    expected: 201,
  });
  await other.login("other-user", "OtherPass!123");
  assert.equal(
    (await other.call("/api/applications.php?user_id=" + loggedIn.user.id))
      .applications.length,
    0,
  );
  await operator.login("test-admin", "TestOnly!98765");
  const adminRows = (await operator.call("/api/applications.php?search=Course"))
    .applications;
  assert.equal(adminRows.length, 1);
  assert.equal(adminRows[0].login, "test-user");
  await operator.call("/api/applications.php", {
    method: "PATCH",
    data: { id: application.application_id, status: "wrong" },
    expected: 400,
  });
  await operator.call("/api/applications.php", {
    method: "PATCH",
    data: { id: 99999, status: "approved" },
    expected: 404,
  });
  await operator.call("/api/applications.php", {
    method: "PATCH",
    data: { id: application.application_id, status: "approved" },
  });
  await operator.call("/api/applications.php", {
    method: "PATCH",
    data: { id: application.application_id, status: "approved" },
  });
  const pending = await user.call("/api/applications.php", {
    method: "POST",
    data: {},
    expected: 201,
  });
  await operator.call("/api/applications.php", {
    method: "PATCH",
    data: { id: application.application_id, status: "pending" },
    expected: 409,
  });
  assert.equal(
    (await operator.call("/api/applications.php?status=pending"))
      .applications[0].id,
    pending.application_id,
  );
  await user.call("/api/auth.php", {
    headers: { Origin: "https://untrusted.example" },
    expected: 403,
  });
  await user.call("/backend/bootstrap.php", { expected: 404 });
  await user.call("/api/auth.php?action=logout", { method: "POST", data: {} });
  assert.equal((await user.call("/api/auth.php")).authenticated, false);
  await user.call("/api/applications.php", { expected: 401 });
  assert(
    !/Fatal error|PHP Warning|PHP Notice|Course API:/.test(serverLog),
    serverLog,
  );
  console.log(
    "API integration checks passed (" + (mysqlDsn ? "MySQL" : "SQLite") + ")",
  );
} finally {
  server.kill();
  await new Promise((resolve) => {
    if (server.exitCode !== null) resolve();
    else server.once("exit", resolve);
  });
  await rm(temp, { recursive: true, force: true });
}
