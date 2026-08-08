// Sunucudaki güncel dağıtım kimliğini döner. Client bunu kendi gömülü
// kimliğiyle karşılaştırır; farklıysa yeni sürüm yayınlanmış demektir.
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    { id: process.env.VERCEL_GIT_COMMIT_SHA || "dev" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
