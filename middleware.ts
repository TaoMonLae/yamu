import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware({
  contentSecurityPolicy: {
    strict: true,
    directives: {
      "font-src": ["'self'", "data:"],
      "img-src": ["blob:", "data:"],
      "manifest-src": ["'self'"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "frame-ancestors": ["'none'"],
    },
  },
});

export const config = {
  matcher: [
    {
      source: "/((?!api|trpc|__clerk|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
