import type { NextConfig } from "next";

const tokenHeaders = [
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Cache-Control", value: "no-store" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  // Household, gallery, and member-invite tokens can appear in the path.
  logging: {
    incomingRequests: {
      ignore: [
        /^\/i\//,
        /^\/g\//,
        /^\/api\/public\/invite\//,
        /^\/api\/public\/gallery\//,
        /^\/api\/public\/member-invite\//,
      ],
    },
  },
  async headers() {
    const shared = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      ...(process.env.VERCEL_ENV === "production"
        ? [
            {
              key: "Strict-Transport-Security",
              value: "max-age=63072000; includeSubDomains",
            },
          ]
        : []),
    ];

    return [
      { source: "/:path*", headers: shared },
      { source: "/i/:path*", headers: tokenHeaders },
      { source: "/g/:path*", headers: tokenHeaders },
      { source: "/api/public/invite/:path*", headers: tokenHeaders },
      { source: "/api/public/gallery/:path*", headers: tokenHeaders },
      { source: "/api/public/member-invite/:path*", headers: tokenHeaders },
    ];
  },
};

export default nextConfig;
