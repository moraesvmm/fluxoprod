import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fluxo ERP",
    short_name: "Fluxo",
    description: "Gestão empresarial no seu dispositivo.",
    start_url: "/tenant/dashboard",
    display: "standalone",
    background_color: "#111827",
    theme_color: "#6d5dfc",
    icons: [
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}