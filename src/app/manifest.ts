import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rostera",
    short_name: "Rostera",
    description: "Staff roster, shifts, leave, and swap self-service.",
    start_url: "/me",
    scope: "/me",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1a1a1a",
    lang: "en",
    icons: [
      {
        src: "/icons/rostera.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/rostera.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  }
}
