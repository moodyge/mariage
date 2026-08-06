type NeonResult<T> = { rows?: T[] };

export async function sql<T>(query: string, params: unknown[] = []) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL n’est pas configurée");
  const host = new URL(connectionString).hostname;
  const response = await fetch(`https://${host}/sql`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Neon-Connection-String": connectionString,
      "Neon-Raw-Text-Output": "false",
      "Neon-Array-Mode": "false",
    },
    body: JSON.stringify({ query, params }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Neon a répondu ${response.status}${detail ? ` : ${detail}` : ""}`);
  }
  return response.json() as Promise<NeonResult<T>>;
}
