import { createSignal, createEffect, onCleanup, type Accessor } from "solid-js";

// ==========================
// Types
// ==========================

export type WsStatus = "connecting" | "connected" | "disconnected" | "error";

export type WsOptions<TReceive> = {
  uri: string;
  onMessage?: (message: TReceive) => void;
  autoReconnect?: boolean;
};

export type WsConnection<TReceive, TSend> = {
  status: Accessor<WsStatus>;
  messages: Accessor<TReceive[]>;
  send: (body: TSend) => void;
  reconnect: () => void;
};

// ==========================
// Helpers
// ==========================

/** Normalizes a URI to a full WebSocket URL. */
const normalizeWsUrl = (input: string): string => {
  if (/^wss?:\/\//.test(input)) return input;
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const [domain] = input.split("/");
  const isAbsolute = domain?.includes(".") || domain?.includes(":");
  return isAbsolute
    ? `${protocol}://${input}`
    : `${protocol}://${window.location.host}/${input.replace(/^\//, "")}`;
};

// ==========================
// Hook
// ==========================

/**
 * Creates a reactive WebSocket connection with auto-reconnect.
 * @returns Connection object with status, messages, send, and reconnect methods.
 */
export const createWs = <TReceive, TSend>(
  options: WsOptions<TReceive>,
): WsConnection<TReceive, TSend> => {
  // Internal status for WebSocket logic
  const [internalStatus, setInternalStatus] =
    createSignal<WsStatus>("connecting");
  // Display status for UI (with minimum duration for "connecting")
  const [displayStatus, setDisplayStatus] =
    createSignal<WsStatus>("connecting");
  const [messages, setMessages] = createSignal<TReceive[]>([]);

  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let displayTimeout: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;
  let connectingStartTime = 0;
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000;
  const minConnectingDuration = 200;

  // Update display status with minimum duration for "connecting"
  createEffect(() => {
    const current = internalStatus();
    const display = displayStatus();

    if (displayTimeout) {
      clearTimeout(displayTimeout);
      displayTimeout = null;
    }

    // Only delay when transitioning from "connecting" to "connected"
    if (display === "connecting" && current === "connected") {
      const elapsed = Date.now() - connectingStartTime;
      const remaining = minConnectingDuration - elapsed;

      if (remaining > 0) {
        displayTimeout = setTimeout(() => setDisplayStatus(current), remaining);
        return;
      }
    }

    setDisplayStatus(current);
  });

  const getReconnectDelay = () => {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
    return Math.min(baseReconnectDelay * Math.pow(2, reconnectAttempts), 30000);
  };

  const connect = () => {
    try {
      connectingStartTime = Date.now();
      setInternalStatus("connecting");
      ws = new WebSocket(normalizeWsUrl(options.uri));

      ws.onopen = () => {
        setInternalStatus("connected");
        reconnectAttempts = 0;
      };

      ws.onmessage = ({ data }) => {
        options.onMessage?.(JSON.parse(data) as TReceive);
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        setInternalStatus("error");
      };

      ws.onclose = (event) => {
        console.debug(`WebSocket closed. Code: ${event.code}`);
        setInternalStatus("disconnected");

        // Don't reconnect if disabled, clean close, or max attempts reached
        if (
          options.autoReconnect === false ||
          event.code === 1000 ||
          reconnectAttempts >= maxReconnectAttempts
        ) {
          return;
        }

        const delay = getReconnectDelay();
        console.debug(
          `Reconnecting in ${delay}ms... (Attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`,
        );

        reconnectTimeout = setTimeout(() => {
          reconnectAttempts++;
          connect();
        }, delay);
      };
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
      setInternalStatus("error");
    }
  };

  // Initial connection
  createEffect(() => {
    connect();
  });

  // Cleanup on unmount
  onCleanup(() => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (displayTimeout) clearTimeout(displayTimeout);
    if (ws) {
      ws.close(1000, "Component unmounted");
      ws = null;
    }
  });

  const send = (body: TSend): void => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not connected");
      return;
    }
    ws.send(JSON.stringify(body));
  };

  const reconnect = (): void => {
    ws?.close();
    ws = null;
    reconnectAttempts = 0;
    connect();
  };

  return {
    status: displayStatus,
    messages,
    send,
    reconnect,
  };
};
