import { join } from "path";
import { openApiSpec, getScalarHtml } from "../docs.ts";
import { jsonResponse } from "./helpers.ts";

const FRONTEND_DIR = join(import.meta.dir, "../../../frontend");
const PUBLIC_DIR = join(import.meta.dir, "../../public");
const ASSETS_DIR = join(import.meta.dir, "../../../assets");

export async function handleStaticRoutes(url: URL): Promise<Response | null> {
  const pathname = url.pathname;

  // 1. Interactive Documentation & Dashboards
  if (pathname === "/docs") {
    return new Response(getScalarHtml(), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (pathname === "/api/v1/openapi.json") {
    return jsonResponse(openApiSpec);
  }

  // 2. Interactive Audience Client (Mobile Join)
  if (pathname === "/join" || pathname === "/join.html" || pathname === "/play") {
    const joinFile = Bun.file(join(PUBLIC_DIR, "join.html"));
    if (await joinFile.exists()) {
      return new Response(joinFile, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  }

  // 3. Telemetry Mission Control Dashboard
  if (pathname === "/dashboard" || pathname === "/dashboard.html") {
    const dashboardFile = Bun.file(join(PUBLIC_DIR, "dashboard.html"));
    if (await dashboardFile.exists()) {
      return new Response(dashboardFile, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  }

  // 4. Shared Branding Assets
  if (pathname.startsWith("/assets/")) {
    const assetPath = join(ASSETS_DIR, pathname.replace("/assets/", ""));
    const file = Bun.file(assetPath);
    if (await file.exists()) {
      return new Response(file, {
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
    }
  }

  // 5. Storefront Customer App
  if (pathname === "/" || pathname === "/index.html") {
    const indexFile = Bun.file(join(FRONTEND_DIR, "index.html"));
    if (await indexFile.exists()) {
      return new Response(indexFile, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  }


  // 6. Generic Frontend File Resolver (pages, css, js, fonts, images)
  const decodedPath = decodeURIComponent(pathname.slice(1));
  const possibleFile = Bun.file(join(FRONTEND_DIR, decodedPath));
  if (await possibleFile.exists()) {
    const contentType =
      possibleFile.type ||
      (decodedPath.endsWith(".js")
        ? "application/javascript; charset=utf-8"
        : decodedPath.endsWith(".css")
        ? "text/css; charset=utf-8"
        : decodedPath.endsWith(".html")
        ? "text/html; charset=utf-8"
        : "application/octet-stream");
    return new Response(possibleFile, {
      headers: { "Content-Type": contentType },
    });
  }

  return null;
}
