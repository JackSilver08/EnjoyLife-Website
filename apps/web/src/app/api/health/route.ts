// Lightweight readiness probe for the Next.js development and production web service.
// Do not check the external API here; API and DB have separate Compose healthchecks.
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({status:"ok",service:"enjoy-life-web"},{
    headers:{"Cache-Control":"no-store"}
  });
}
