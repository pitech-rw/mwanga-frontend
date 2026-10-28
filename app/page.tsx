"use client";

import { FormEvent, useEffect, useState } from "react";
import styles from "./page.module.css";

type HealthResponse = {
  ok: boolean;
  database: string;
  userCount: number;
  timestamp: string;
};

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  name: string;
  email: string;
  role: string;
};

const initialForm: FormState = {
  name: "",
  email: "",
  role: "member",
};

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3005";

  const loadUsers = async () => {
    try {
      const response = await fetch(`${apiUrl}/users`);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = (await response.json()) as User[];
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch(`${apiUrl}/health`);
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as HealthResponse;
        setHealth(data);
      } catch (err) {
        setError((current) => current ?? (err instanceof Error ? err.message : "Unable to reach backend"));
      }
    };

    void fetchHealth();
    void loadUsers();
  }, [apiUrl]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "Unable to create user");
      }

      setForm(initialForm);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.panel}>
          <p className={styles.badge}>User management</p>
          <h1>MWANGA users</h1>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.fieldRow}>
              <label>
                Name
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Jane Doe"
                  required
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="jane@example.com"
                  required
                />
              </label>
            </div>

            <div className={styles.fieldRow}>
              <label>
                Role
                <select
                  value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value })}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                </select>
              </label>
            </div>

            <button type="submit" disabled={submitting} className={styles.primaryButton}>
              {submitting ? "Creating..." : "Create user"}
            </button>
          </form>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.tableWrap}>
            {loading ? (
              <p className={styles.status}>Loading users...</p>
            ) : users.length === 0 ? (
              <p className={styles.status}>No users yet.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td>{user.isActive ? "Active" : "Inactive"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {health && (
            <div className={styles.card}>
              <div className={styles.row}>
                <span>Backend</span>
                <strong>{health.ok ? "Healthy" : "Unhealthy"}</strong>
              </div>
              <div className={styles.row}>
                <span>Database</span>
                <strong>{health.database}</strong>
              </div>
              <div className={styles.row}>
                <span>Users</span>
                <strong>{health.userCount}</strong>
              </div>
              <div className={styles.row}>
                <span>Last check</span>
                <strong>{new Date(health.timestamp).toLocaleString()}</strong>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
