import { NextResponse } from "next/server";
import { AUTH_COOKIE, authToken, passwordIsValid, requestIsAuthenticated } from "@/lib/server-auth";

export async function GET() {
  return NextResponse.json({ authenticated: await requestIsAuthenticated() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { password?: string } | null;
  if (!body?.password || !passwordIsValid(body.password)) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(AUTH_COOKIE, authToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
