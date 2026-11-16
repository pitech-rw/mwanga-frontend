"use client";

import { useCallback, useEffect, useState } from "react";
import { userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import { PERMISSIONS } from "../lib/permission-strings";
import { userMayUsePermission } from "../lib/table-row-actions";

type IncidentMessage = {
  id: number;
  body: string;
  kind: string;
  createdAt: string;
  author?: { firstName?: string; lastName?: string; username?: string } | null;
};

type IncidentRecord = {
  id: number;
  trackId: string;
  status: string;
  messages?: IncidentMessage[];
  reporter?: { id?: number } | null;
};

type IncidentReviewPanelProps = {
  incidentId: number;
  listStatus?: string;
  onChanged?: () => void;
};

function authorLabel(author: IncidentMessage["author"]): string {
  if (!author) {
    return "User";
  }
  const name = [author.firstName, author.lastName].filter(Boolean).join(" ").trim();
  return name || author.username || "User";
}

function kindLabel(kind: string): string {
  switch (kind) {
    case "initial":
      return "Report";
    case "question":
      return "Question";
    case "reply":
      return "Reply";
    case "resolution":
      return "Resolution";
    default:
      return kind.replace(/_/g, " ");
  }
}

const TERMINAL = new Set(["damaged", "dismissed"]);

export function IncidentReviewPanel({ incidentId, listStatus, onChanged }: IncidentReviewPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incident, setIncident] = useState<IncidentRecord | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [dismissNote, setDismissNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meRes, incidentRes] = await Promise.all([
        authFetch("/auth/me"),
        authFetch(`/incidents/${incidentId}`),
      ]);
      if (meRes.ok) {
        const me = (await meRes.json()) as {
          id?: number;
          permissions?: string[];
        };
        setCurrentUserId(typeof me.id === "number" ? me.id : null);
        setPermissions(Array.isArray(me.permissions) ? me.permissions : []);
      }
      if (!incidentRes.ok) {
        throw new Error(await userMessageFromResponse("load", incidentRes));
      }
      const data = (await incidentRes.json()) as IncidentRecord;
      setIncident(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load incident");
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const canReview = userMayUsePermission(permissions, PERMISSIONS.incidents.review);
  const canWrite = userMayUsePermission(permissions, PERMISSIONS.incidents.write);

  const status = incident?.status ?? listStatus ?? "";
  const isTerminal = TERMINAL.has(status);
  const isReporter = incident?.reporter?.id != null && incident.reporter.id === currentUserId;

  const canAsk = canReview && !isTerminal && (status === "open" || status === "awaiting_review");
  const canReply = canWrite && !isTerminal && status === "awaiting_swapper" && isReporter;
  const canMarkDamaged = canReview && !isTerminal;
  const canDismiss = canReview && !isTerminal;

  async function postMessage() {
    const body = draft.trim();
    if (!body) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch(`/incidents/${incidentId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        throw new Error(await userMessageFromResponse("create", res));
      }
      setDraft("");
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message failed");
    } finally {
      setBusy(false);
    }
  }

  async function markDamaged() {
    if (!window.confirm("Mark this pack as damaged and return it to warehouse? This cannot be undone.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch(`/incidents/${incidentId}/mark-damaged`, { method: "POST" });
      if (!res.ok) {
        throw new Error(await userMessageFromResponse("create", res));
      }
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mark damaged failed");
    } finally {
      setBusy(false);
    }
  }

  async function dismissIncident() {
    if (!window.confirm("Dismiss this incident without warehouse action?")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch(`/incidents/${incidentId}/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: dismissNote.trim() || undefined }),
      });
      if (!res.ok) {
        throw new Error(await userMessageFromResponse("create", res));
      }
      setDismissNote("");
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dismiss failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="incident-review-muted">Loading conversation…</p>;
  }

  const messages = incident?.messages ?? [];

  return (
    <div className="incident-review">
      <p className="record-detail-fields-label">Conversation</p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="incident-thread" aria-label="Incident messages">
        {messages.length === 0 ? (
          <li className="incident-review-muted">No messages yet.</li>
        ) : (
          messages.map((msg) => (
            <li key={msg.id} className="incident-thread-item">
              <div className="incident-thread-meta">
                <span className="incident-thread-kind">{kindLabel(msg.kind)}</span>
                <span>{authorLabel(msg.author)}</span>
                <time dateTime={msg.createdAt}>{new Date(msg.createdAt).toLocaleString()}</time>
              </div>
              <p className="incident-thread-body">{msg.body}</p>
            </li>
          ))
        )}
      </ul>

      {(canAsk || canReply) && (
        <div className="incident-compose">
          <label className="field-label" htmlFor="incident-message-draft">
            {canAsk ? "Ask the swapper" : "Your reply"}
          </label>
          <textarea
            id="incident-message-draft"
            className="input"
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={busy}
            placeholder={canAsk ? "Clarifying question…" : "Reply to the office…"}
          />
          <button type="button" className="btn btn-primary" disabled={busy || !draft.trim()} onClick={() => void postMessage()}>
            Send
          </button>
        </div>
      )}

      {canMarkDamaged || canDismiss ? (
        <div className="incident-review-actions">
          {canMarkDamaged ? (
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void markDamaged()}>
              Mark damaged
            </button>
          ) : null}
          {canDismiss ? (
            <input
              type="text"
              className="input"
              placeholder="Dismissal note (optional)"
              value={dismissNote}
              onChange={(e) => setDismissNote(e.target.value)}
              disabled={busy}
            />
          ) : null}
          {canDismiss ? (
            <button type="button" className="btn" disabled={busy} onClick={() => void dismissIncident()}>
              Dismiss
            </button>
          ) : null}
        </div>
      ) : null}

      {isTerminal ? (
        <p className="incident-review-muted">This incident is closed ({status.replace(/_/g, " ")}).</p>
      ) : null}
    </div>
  );
}