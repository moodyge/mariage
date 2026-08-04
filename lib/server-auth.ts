import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const AUTH_COOKIE = "place_parfaite_auth";

function password() {
  if (!process.env.APP_PASSWORD) throw new Error("APP_PASSWORD n’est pas configuré");
  return process.env.APP_PASSWORD;
}

function token() {
  return createHmac("sha256", process.env.AUTH_SECRET || password())
    .update("place-parfaite")
    .digest("hex");
}

export function passwordIsValid(candidate: string) {
  const expected = Buffer.from(password());
  const received = Buffer.from(candidate);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function requestIsAuthenticated() {
  const received = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!received) return false;
  const expected = Buffer.from(token());
  const actual = Buffer.from(received);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function authToken() {
  return token();
}
