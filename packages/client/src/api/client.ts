const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export function createRoom() {
  return request<{ id: string; hostKey: string }>("/rooms", { method: "POST" });
}

export function getRoom(id: string) {
  return request<{ id: string; status: string; participantCount: number }>(`/rooms/${id}`);
}

export function getToken(roomId: string, participantName: string, hostKey?: string) {
  return request<{ token: string; isHost: boolean; iceServers: any[] }>(
    `/rooms/${roomId}/token`,
    {
      method: "POST",
      body: JSON.stringify({ participantName, hostKey }),
    }
  );
}

export function uploadArtifact(roomId: string, type: string, filename: string, content: string, contentType: string) {
  return request<{ key: string; url: string }>(`/rooms/${roomId}/artifacts`, {
    method: "POST",
    body: JSON.stringify({ type, filename, content, contentType }),
  });
}
