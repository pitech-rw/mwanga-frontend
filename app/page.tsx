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

const summaryCards = [
  { label: "Active riders", value: "1,248", change: "+8.4%" },
  { label: "Batteries in fleet", value: "3,420", change: "+2.1%" },
  { label: "Swaps today", value: "486", change: "+12.7%" },
  { label: "Revenue", value: "KES 2.84M", change: "+6.9%" },
];

const inventory = [
  { id: "BAT-1042", status: "Available", station: "Goma Central", soc: 92 },
  { id: "BAT-2018", status: "Assigned", station: "Goma West", soc: 64 },
  { id: "BAT-3011", status: "Charging", station: "Goma South", soc: 38 },
  { id: "BAT-4871", status: "Faulty", station: "Goma Hub", soc: 11 },
];

const swaps = [
  { rider: "A. Marie", bike: "KDG 834P", battery: "BAT-1042", time: "08:15", status: "Completed" },
  { rider: "M. Romain", bike: "KBA 412X", battery: "BAT-2018", time: "08:42", status: "In progress" },
  { rider: "P. Quentin", bike: "KCC 774M", battery: "BAT-3011", time: "09:05", status: "Assigned" },
  { rider: "J.  Rosalinda", bike: "KDL 219Y", battery: "BAT-4871", time: "09:28", status: "Retry" },
];

const stations = [
  { name: "Goma Central", online: true, throughput: "96%", available: 24 },
  { name: "Goma West", online: true, throughput: "89%", available: 18 },
  { name: "Goma South", online: false, throughput: "62%", available: 9 },
  { name: "Goma Hub", online: true, throughput: "91%", available: 17 },
];

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
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>M</div>
          <div>
            <strong>MWANGA</strong>
            <span>Station ops</span>
          </div>
        </div>

        <nav className={styles.nav}>
          <a className={styles.active}>Overview</a>
          <a>Riders</a>
          <a>Bikes</a>
          <a>Batteries</a>
          <a>Stations</a>
          <a>Swaps</a>
          <a>Wallets</a>
        </nav>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.label}>Operations dashboard</p>
            <h1>Battery swap command center</h1>
          </div>
          <button className={styles.primaryButton}>Dispatch battery</button>
        </header>

        <section className={styles.summaryGrid}>
          {summaryCards.map((card) => (
            <article key={card.label} className={styles.card}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <em>{card.change}</em>
            </article>
          ))}
        </section>

        <section className={styles.contentGrid}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Battery inventory</h2>
              <a href="#">View all</a>
            </div>

            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Battery</th>
                    <th>Status</th>
                    <th>Station</th>
                    <th>SOC</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>
                        <span className={`${styles.badge} ${styles[item.status.toLowerCase().replace(/\s+/g, "-")]}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>{item.station}</td>
                      <td>{item.soc}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Live swap queue</h2>
              <a href="#">Open queue</a>
            </div>

            {swaps.map((swap) => (
              <div key={`${swap.rider}-${swap.time}`} className={styles.swapRow}>
                <div>
                  <strong>{swap.rider}</strong>
                  <span>
                    {swap.bike} · {swap.battery}
                  </span>
                </div>
                <div className={styles.swapMeta}>
                  <span>{swap.time}</span>
                  <em>{swap.status}</em>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.bottomGrid}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Station status</h2>
              <a href="#">Map</a>
            </div>

            <div className={styles.stationList}>
              {stations.map((station) => (
                <div key={station.name} className={styles.stationItem}>
                  <div>
                    <strong>{station.name}</strong>
                    <span>{station.available} batteries available</span>
                  </div>
                  <div className={styles.stationMeta}>
                    <span className={station.online ? styles.online : styles.offline}>
                      {station.online ? "Online" : "Offline"}
                    </span>
                    <em>{station.throughput}</em>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Operational notes</h2>
            </div>
            <ul className={styles.notesList}>
              <li>Battery rotation policy updated for north corridor stations.</li>
              <li>Two stations require maintenance check after high SOC variance.</li>
              <li>Rider wallet top-up window is scheduled for 18:00 local time.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
