"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;
let socketUrl: string | null = null;

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function resolveSocketUrl(): string | null {
  const rawUrl = process.env.NEXT_PUBLIC_SOCKET_IO_URL ?? process.env.SOCKET_IO_URL ?? null;

  if (!rawUrl) {
    if (typeof window === "undefined") {
      return null;
    }

    return `${window.location.protocol}//${window.location.hostname}:3333`;
  }

  if (typeof window === "undefined") {
    return rawUrl;
  }

  try {
    const url = new URL(rawUrl);

    if (isLoopbackHost(url.hostname) && !isLoopbackHost(window.location.hostname)) {
      url.hostname = window.location.hostname;
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

export function getSocket(): Socket | null {
  const url = resolveSocketUrl();

  if (!url) {
    return null;
  }

  if (socketUrl !== url) {
    socket?.disconnect();
    socket = io(url, {
      autoConnect: false,
      transports: ["websocket", "polling"]
    });
    socketUrl = url;
  }

  return socket;
}
