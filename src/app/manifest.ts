import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NearShop",
    short_name: "NearShop",
    description: "NearShop shopping app",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0b5fff",
    icons: [
      {
        src: "/icons/Logo.png",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/icons/Logo.png",
        sizes: "512x512",
        type: "image/svg+xml",
      },
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
  };
}
