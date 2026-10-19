"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Same key api.ts and AuthContext write to. Read at handshake time rather
// than captured in a closure, so every reconnect picks up whatever the
// silent-refresh cycle last stored instead of replaying a dead token.
const ACCESS_TOKEN_KEY = "dy_access_token";

function readAccessToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY) || undefined;
  } catch {
    // Private mode / blocked storage — fall back to the cookie path.
    return undefined;
  }
}

interface SocketContextValue {
  // null while signed out or before initial connect. Components subscribe
  // through useSocketEvent(); the raw socket is exposed for one-off emit().
  socket: Socket | null;
  connected: boolean;
  // Why the last connection attempt failed, or null when healthy. Surfaced
  // in the health dot's tooltip — a socket that silently never connects is
  // the hardest kind of outage to notice, because every page still loads.
  lastError: string | null;
}

const SocketContext = createContext<SocketContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────
// BUG-064 — proper socket lifecycle.
//
// Previously we keyed the useEffect on `accessToken` from AuthContext. That
// worked when JWTs lived in localStorage and AuthContext rewrote them on
// every signin/refresh, but the cookie migration broke it: silent refreshes
// land NEW cookies without touching AuthContext state, so accessToken stays
// stale and the effect never re-runs → socket keeps trying to connect with
// dead credentials, never reconnects after rotation.
//
// New model:
//   - Connect once when user.id is known (signed in).
//   - Tear down when user becomes null (signed out).
//   - Socket.IO's built-in auto-reconnect handles token rotation: on every
//     reconnect, the browser sends the LATEST dy_access cookie (because we
//     set withCredentials:true on the client AND the backend reads from
//     the Cookie header on each handshake). So a silent refresh just means
//     the next reconnect uses the fresh token — no React plumbing needed.
//   - withCredentials sends cookies cross-origin, which we need because
//     api.dropyard.app and dropyard.app are different origins in prod.
// ─────────────────────────────────────────────────────────────────────────
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setSocket(null);
      setConnected(false);
      setLastError(null);
      return;
    }

    const s = io(SOCKET_URL, {
      // Two independent credentials, because either one alone has a failure
      // mode that takes realtime down silently:
      //
      //   withCredentials  — sends the dy_access cookie. Works when the
      //                      cookie's Secure/SameSite/Domain attributes line
      //                      up with the deployment. Those attributes are
      //                      derived from NODE_ENV (see backend cookies.ts),
      //                      so a prod box that never sets NODE_ENV issues a
      //                      cookie the browser won't attach here — and the
      //                      handshake fails with "Missing auth token" while
      //                      every REST call keeps working, because those
      //                      carry a Bearer token instead. That asymmetry is
      //                      exactly what "pages load but nothing is live"
      //                      looks like.
      //   auth callback    — sends the same JWT the REST layer uses. A
      //                      function, not an object: socket.io invokes it on
      //                      every connection attempt, so each reconnect
      //                      reads the token the silent-refresh cycle just
      //                      wrote instead of replaying a 15-minute-old one.
      //
      // The backend accepts either (socket.ts reads the cookie first, then
      // handshake.auth.token), so realtime now survives a cookie problem.
      withCredentials:        true,
      auth:                   (cb) => cb({ token: readAccessToken() }),
      // Default order, deliberately: open on HTTP long-polling, then upgrade
      // to a real WebSocket once it's proven to work. Forcing "websocket"
      // first means a reverse proxy that doesn't pass the Upgrade/Connection
      // headers — the default nginx `proxy_pass` does not — fails the
      // handshake outright. Polling traverses any proxy, so realtime degrades
      // to a slightly chattier transport instead of disappearing.
      transports:             ["polling", "websocket"],
      reconnection:           true,
      reconnectionAttempts:   Infinity,
      reconnectionDelay:      1000,
      reconnectionDelayMax:   5000,
      // Aggressive timeouts so a stuck connection bounces fast instead of
      // sitting silent for the full default (20s).
      timeout:                10000,
    });

    s.on("connect", () => {
      setConnected(true);
      setLastError(null);
      // eslint-disable-next-line no-console
      console.info("[socket] connected", s.id, "via", s.io.engine.transport.name);
      // Log the upgrade too — "connected via polling" that never upgrades is
      // the fingerprint of a proxy missing the WebSocket upgrade headers.
      s.io.engine.on("upgrade", (t: { name: string }) => {
        // eslint-disable-next-line no-console
        console.info("[socket] upgraded to", t.name);
      });
    });
    s.on("disconnect", (reason) => {
      setConnected(false);
      // eslint-disable-next-line no-console
      console.info("[socket] disconnected:", reason);
    });
    s.on("connect_error", (err) => {
      // Most common causes: no credential reached the handshake, the origin
      // isn't in the backend's ALLOWED_ORIGINS, or the backend is down.
      setLastError(err.message || "connection failed");
      // eslint-disable-next-line no-console
      console.warn("[socket] connect_error:", err.message);
    });

    setSocket(s);
    return () => {
      s.removeAllListeners();
      s.disconnect();
    };
    // Keyed on user.id ONLY. user object identity changes on every refreshUser()
    // call; pulling just the id keeps the effect from re-running spuriously.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ socket, connected, lastError }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used inside <SocketProvider>");
  return ctx;
}

// Subscribe to a server event for the lifetime of a component. Re-binds when
// the socket instance changes (reconnect) or the handler identity changes.
// The handler ref pattern lets callers pass an inline function without
// triggering re-binds on every render.
export function useSocketEvent<T = unknown>(
  event: string,
  handler: (payload: T) => void,
): void {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);
  useEffect(() => { handlerRef.current = handler; }, [handler]);

  useEffect(() => {
    if (!socket) return;
    const wrapped = (payload: T) => handlerRef.current(payload);
    socket.on(event, wrapped);
    return () => {
      socket.off(event, wrapped);
    };
  }, [socket, event]);
}
