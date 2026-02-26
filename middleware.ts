import { NextResponse } from "next/server";

export function middleware(request: Request) {
  const url = new URL(request.url);

  // Redirect ?page= parameter only for the home page
  if (url.pathname === "/" && url.searchParams.has("page")) {
    return NextResponse.redirect(url.origin);
  }

  return NextResponse.next();
}
