import { useParams, useSearchParams } from "react-router-dom";

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name") || "Anonymous";
  const hostKey = searchParams.get("host_key") || undefined;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <p>Room: {roomId} | Name: {name} | Host: {hostKey ? "Yes" : "No"}</p>
    </div>
  );
}
