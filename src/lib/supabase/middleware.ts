import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { maxAge: 60 * 60 * 24 * 365 },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/signup");
  // Girişsiz erişilebilen yasal/bilgi sayfaları
  const legalRoutes = ["/gizlilik", "/kullanim-kosullari", "/kvkk"];
  const isLegalRoute = legalRoutes.some((r) => pathname.startsWith(r));
  // /r/... → randevu onay · /b/... → online randevu (ikisi de girişsiz, herkese açık)
  const isPublicRoute =
    pathname === "/" ||
    isAuthRoute ||
    isLegalRoute ||
    pathname.startsWith("/r/") ||
    pathname.startsWith("/b/") ||
    pathname.startsWith("/api/booking/") || // online randevu oluşturma (herkese açık)
    pathname.startsWith("/api/push/run"); // cron (secret ile korumalı)

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
