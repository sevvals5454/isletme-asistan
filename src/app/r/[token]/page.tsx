"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2, CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatAppointmentWhen } from "@/lib/appointments";

type Appt = {
  customer_name: string;
  start_at: string;
  duration_min: number;
  service_name: string | null;
  org_name: string;
  response: string | null;
};

export default function ConfirmPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [appt, setAppt] = useState<Appt | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data, error } = await sb.rpc("get_appointment_by_token", {
        p_token: token,
      });
      if (error || !data || data.length === 0) setMissing(true);
      else {
        setAppt(data[0] as Appt);
        setResponse((data[0] as Appt).response);
      }
      setLoading(false);
    })();
  }, [token]);

  async function respond(r: "confirmed" | "declined") {
    setSaving(true);
    const sb = createClient();
    const { error } = await sb.rpc("respond_appointment", {
      p_token: token,
      p_response: r,
    });
    if (!error) setResponse(r);
    setSaving(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-sm">
        {loading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        ) : missing || !appt ? (
          <>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <XCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <h1 className="font-semibold">Randevu bulunamadı</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Bağlantı geçersiz veya süresi dolmuş olabilir.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CalendarClock className="h-6 w-6" />
            </div>
            <h1 className="text-lg font-semibold">{appt.org_name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Merhaba {appt.customer_name}, randevunuz:
            </p>
            <div className="my-4 rounded-xl border bg-muted/40 p-3 text-sm">
              <div className="font-medium">
                {formatAppointmentWhen(appt.start_at)}
              </div>
              <div className="text-xs text-muted-foreground">
                {appt.service_name ?? "Randevu"} · {appt.duration_min} dk
              </div>
            </div>

            {response === "confirmed" ? (
              <div className="rounded-lg bg-green-100 p-3 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle className="mx-auto mb-1 h-5 w-5" />
                Katılımınız onaylandı. Görüşmek üzere!
              </div>
            ) : response === "declined" ? (
              <div className="rounded-lg bg-muted p-3 text-sm font-medium text-muted-foreground">
                <XCircle className="mx-auto mb-1 h-5 w-5" />
                Gelemeyeceğinizi ilettiniz. Bilgi için teşekkürler.
              </div>
            ) : (
              <>
                <p className="mb-3 text-sm">Katılacak mısınız?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => respond("confirmed")}
                    disabled={saving}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Geliyorum
                  </button>
                  <button
                    onClick={() => respond("declined")}
                    disabled={saving}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Gelemiyorum
                  </button>
                </div>
              </>
            )}

            {response && (
              <button
                onClick={() =>
                  respond(response === "confirmed" ? "declined" : "confirmed")
                }
                disabled={saving}
                className="mt-3 text-xs text-muted-foreground underline hover:text-foreground"
              >
                Yanıtımı değiştir
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
