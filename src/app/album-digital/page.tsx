"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Check,
  Crown,
  Heart,
  Images,
  QrCode,
  ScanLine,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import {
  ALBUM_PLANS_LIST,
  AlbumPlanId,
  isUnlimitedPhotosPlan,
} from "@/lib/albumPlans";
import { parseJsonSafe, summarizeHttpError } from "@/lib/http";

type Template = {
  id: string;
  name: string;
  description: string;
  colors: string[];
  level: 1 | 2 | 3;
};

const templates: Template[] = [
  {
    id: "classic",
    name: "Editorial",
    description: "Limpia y elegante",
    colors: ["#FCEBDB", "#F4C8B8", "#23395B"],
    level: 1,
  },
  {
    id: "modern",
    name: "Moderna",
    description: "Sobria y minimal",
    colors: ["#E7EEF6", "#AAC7E5", "#1D3557"],
    level: 2,
  },
  {
    id: "romantic",
    name: "Romántica",
    description: "Suave y cálida",
    colors: ["#FFE4E1", "#F8B4B4", "#5A2A44"],
    level: 2,
  },
  {
    id: "elegant",
    name: "Nocturna",
    description: "Contraste de lujo",
    colors: ["#1F2937", "#B08968", "#F5F5F4"],
    level: 3,
  },
  {
    id: "rustic",
    name: "Tierra",
    description: "Natural y orgánica",
    colors: ["#F0D9B5", "#C08A5A", "#4A3F35"],
    level: 3,
  },
];

const planLevels: Record<AlbumPlanId, 1 | 2 | 3> = {
  album_50: 1,
  album_200: 2,
  album_unlimited: 3,
};

export default function AlbumDigitalPage() {
  const [loadingPlan, setLoadingPlan] = useState<AlbumPlanId | null>(null);
  const [albumTitle, setAlbumTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const [selectedPlanId, setSelectedPlanId] = useState<AlbumPlanId>("album_200");
  const [showForm, setShowForm] = useState(false);

  const selectedPlan = useMemo(
    () => ALBUM_PLANS_LIST.find((plan) => plan.id === selectedPlanId)!,
    [selectedPlanId]
  );

  const selectedPlanLevel = planLevels[selectedPlanId];

  const canUseTemplate = (template: Template, planId: AlbumPlanId): boolean => {
    return planLevels[planId] >= template.level;
  };

  const handleSelectPlan = (planId: AlbumPlanId) => {
    setSelectedPlanId(planId);

    const currentTemplate = templates.find((template) => template.id === selectedTemplate);
    if (currentTemplate && !canUseTemplate(currentTemplate, planId)) {
      const fallbackTemplate = templates.find((template) => canUseTemplate(template, planId));
      if (fallbackTemplate) {
        setSelectedTemplate(fallbackTemplate.id);
      }
    }

    setShowForm(true);
    setTimeout(() => {
      document.getElementById("album-form")?.scrollIntoView({ behavior: "smooth" });
    }, 120);
  };

  const handleCheckout = async () => {
    if (!albumTitle.trim()) {
      alert("Por favor, agrega un título para tu álbum.");
      return;
    }

    setLoadingPlan(selectedPlanId);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlanId,
          albumTitle: albumTitle.trim(),
          albumTemplate: selectedTemplate,
        }),
      });

      const { data, raw } = await parseJsonSafe<{ url?: string; error?: string }>(response);
      if (response.ok && data?.url) {
        window.location.href = data.url;
      } else {
        const errorMessage = data?.error || summarizeHttpError(
          response.status,
          raw,
          "No se pudo iniciar el pago"
        );
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Error en checkout:", error);
      alert("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="pt-16 overflow-hidden bg-[#FBF8F5] text-[#1E2E4A]">
      <section className="relative px-4 pt-12 pb-14 sm:px-6 sm:pt-16 sm:pb-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-14 -left-20 h-56 w-56 rounded-full bg-[#F4C8B8]/45 blur-3xl" />
          <div className="absolute -right-16 top-16 h-64 w-64 rounded-full bg-[#96B8D9]/35 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-[#F9D9C9]/35 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#7A5A4A] shadow-sm">
                <Sparkles className="h-4 w-4" />
                Álbum digital bluebook
              </div>

              <h1 className="font-heading text-4xl leading-tight text-[#1D2E4B] sm:text-5xl lg:text-6xl">
                Tu boda en un álbum móvil,
                <span className="block text-[#C96F5A]">listo para compartir por QR</span>
              </h1>

              <p className="mt-6 max-w-xl font-body text-base text-[#42516B] sm:text-lg">
                Diseñado para celular, inspirado en una estética editorial romántica. Tus invitados escanean,
                suben sus fotos y el recuerdo se arma en tiempo real.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  { icon: QrCode, text: "QR para invitados en todos los planes" },
                  { icon: Images, text: "50, 200 o fotos ilimitadas" },
                  { icon: Smartphone, text: "Experiencia optimizada para móvil" },
                  { icon: ShieldCheck, text: "Pago único y acceso de por vida" },
                ].map((item) => (
                  <div
                    key={item.text}
                    className="flex items-center gap-2.5 rounded-2xl border border-[#E9DFD9] bg-white/90 px-4 py-3 text-sm font-medium text-[#32405A] shadow-sm"
                  >
                    <item.icon className="h-4 w-4 text-[#C96F5A]" />
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => {
                    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1D2E4B] px-7 py-3.5 font-semibold text-white transition hover:bg-[#283E61]"
                >
                  Elegir plan
                  <ArrowRight className="h-4 w-4" />
                </button>
                <Link
                  href="/precios"
                  className="inline-flex items-center justify-center rounded-full border border-[#D4C4BC] bg-white px-7 py-3.5 font-semibold text-[#334766] transition hover:bg-[#F9F3EF]"
                >
                  Ver comparativa completa
                </Link>
              </div>
            </div>

            <div className="mx-auto w-full max-w-md rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-[#C96F5A]/10 backdrop-blur">
              <div className="rounded-3xl bg-[#1D2E4B] p-5 text-white">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#BFD6F0]">Flujo de invitados</p>
                <h3 className="mt-2 font-heading text-2xl">Escanean y suben</h3>
                <p className="mt-2 text-sm text-[#DDE7F5]">
                  Desde tu panel generas un QR para compartir durante el evento. Cada invitado entra a una
                  página de carga lista para móvil.
                </p>
              </div>

              <div className="mt-4 space-y-3">
                {[
                  { icon: ScanLine, title: "1. Compartes QR", body: "En mesa de regalos, pista o invitación" },
                  { icon: UploadCloud, title: "2. Suben fotos", body: "Sin app, directo desde su celular" },
                  { icon: Camera, title: "3. Curas el álbum", body: "Ordenas todo en un flipbook elegante" },
                ].map((step) => (
                  <div
                    key={step.title}
                    className="rounded-2xl border border-[#ECE3DD] bg-[#FFFDFB] p-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-[#FDE7DF] p-2 text-[#C96F5A]">
                        <step.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#233754]">{step.title}</p>
                        <p className="text-xs text-[#566580]">{step.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center sm:mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6C5F]">Planes del álbum digital</p>
            <h2 className="mt-3 font-heading text-3xl text-[#1D2E4B] sm:text-4xl">
              3 planes, todos con QR para invitados
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-[#566580] sm:text-base">
              Elige por volumen de fotos. La experiencia del álbum y el flujo QR están incluidos desde el plan de entrada.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {ALBUM_PLANS_LIST.map((plan) => (
              <article
                key={plan.id}
                className={`rounded-3xl border p-6 shadow-lg transition ${
                  plan.featured
                    ? "border-[#1D2E4B] bg-[#1D2E4B] text-white shadow-[#1D2E4B]/20"
                    : "border-[#E5D8CF] bg-white"
                }`}
              >
                {plan.badge && (
                  <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#F8D8CB] px-3 py-1 text-xs font-semibold text-[#8B3E2B]">
                    <Crown className="h-3.5 w-3.5" />
                    {plan.badge}
                  </div>
                )}

                <p className={`text-xs uppercase tracking-[0.14em] ${plan.featured ? "text-[#BDD1EA]" : "text-[#8A6D60]"}`}>
                  {plan.subtitle}
                </p>
                <h3 className="mt-2 font-heading text-3xl">{plan.name}</h3>
                <p className={`mt-2 text-sm ${plan.featured ? "text-[#D9E5F5]" : "text-[#5A6A84]"}`}>{plan.description}</p>

                <div className="mt-6 flex items-end gap-2">
                  <span className="font-heading text-5xl">${plan.priceMx.toLocaleString()}</span>
                  <span className={`mb-1 text-sm ${plan.featured ? "text-[#D9E5F5]" : "text-[#5A6A84]"}`}>MXN</span>
                </div>

                <div
                  className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    plan.featured ? "bg-white/12 text-white" : "bg-[#FCECE5] text-[#A4533E]"
                  }`}
                >
                  <Images className="h-3.5 w-3.5" />
                  {plan.maxPhotosLabel}
                </div>

                <ul className="mt-5 space-y-2.5 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5">
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${
                          plan.featured ? "bg-white/18" : "bg-[#FDE9E0]"
                        }`}
                      >
                        <Check className={`h-3.5 w-3.5 ${plan.featured ? "text-white" : "text-[#C96F5A]"}`} />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 font-semibold transition ${
                    plan.featured
                      ? "bg-[#F7CAB8] text-[#5D2D20] hover:bg-[#F4BCAB]"
                      : "bg-[#1D2E4B] text-white hover:bg-[#2A4164]"
                  }`}
                >
                  Elegir este plan
                  <ArrowRight className="h-4 w-4" />
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6 sm:pb-20">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-[#E7DBD2] bg-white px-6 py-8 shadow-xl sm:px-8">
          <div className="grid gap-7 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8A6A5E]">Incluido en todos los planes</p>
              <h3 className="mt-2 font-heading text-3xl text-[#1D2E4B]">Módulo QR de invitados</h3>
              <p className="mt-3 text-sm text-[#5A6A84] sm:text-base">
                Dentro del panel de administración puedes generar invitaciones, abrir su QR, descargarlo y compartirlo por WhatsApp o desde el botón compartir del celular.
              </p>

              <div className="mt-5 space-y-3">
                {[
                  "Un QR por invitado o uno general para toda la fiesta",
                  "Control de cuántas fotos sube cada invitado",
                  "Todo entra al mismo álbum para que lo ordenes al final",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5 text-sm text-[#31425F]">
                    <div className="mt-0.5 rounded-full bg-[#FDE9E0] p-1 text-[#C96F5A]">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-[#EADFD8] bg-[#FBF8F5] p-5">
              <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[#8A6B5F]">Invitación lista</p>
                  <p className="font-heading text-xl text-[#1D2E4B]">Mesa principal</p>
                </div>
                <div className="rounded-xl bg-[#FDE9E0] p-2 text-[#C96F5A]">
                  <QrCode className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1D2E4B] px-3 py-2.5 text-sm font-semibold text-white">
                  <Share2 className="h-4 w-4" />
                  Compartir
                </button>
                <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D7C8BE] bg-white px-3 py-2.5 text-sm font-semibold text-[#334766]">
                  <QrCode className="h-4 w-4" />
                  Descargar QR
                </button>
              </div>

              <p className="mt-4 text-xs text-[#687690]">
                En producción, este bloque se genera automáticamente desde cada invitación del panel admin.
              </p>
            </div>
          </div>
        </div>
      </section>

      {showForm && (
        <section id="album-form" className="px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="mx-auto max-w-4xl rounded-[30px] border border-[#E5D8CF] bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-7 flex items-center gap-3">
              <div className="rounded-xl bg-[#FDE9E0] p-2 text-[#C96F5A]">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.13em] text-[#8A6A5E]">Checkout</p>
                <h3 className="font-heading text-2xl text-[#1D2E4B]">Personaliza tu álbum</h3>
              </div>
            </div>

            <div className="grid gap-7 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <label htmlFor="album-title" className="mb-2 block text-sm font-semibold text-[#2D3E5A]">
                  Título del álbum
                </label>
                <input
                  id="album-title"
                  value={albumTitle}
                  onChange={(event) => setAlbumTitle(event.target.value)}
                  placeholder="Ej. Fernanda & Miguel - 23 Nov"
                  maxLength={100}
                  className="w-full rounded-2xl border border-[#DCCFC6] px-4 py-3.5 text-sm text-[#1D2E4B] outline-none transition placeholder:text-[#8D97A8] focus:border-[#C96F5A] focus:ring-4 focus:ring-[#FDE3D9]"
                />

                <p className="mt-5 mb-2 text-sm font-semibold text-[#2D3E5A]">Plantilla</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {templates.map((template) => {
                    const disabled = !canUseTemplate(template, selectedPlanId);
                    const selected = selectedTemplate === template.id;

                    return (
                      <button
                        key={template.id}
                        disabled={disabled}
                        onClick={() => setSelectedTemplate(template.id)}
                        className={`rounded-2xl border p-3 text-left transition ${
                          selected
                            ? "border-[#C96F5A] bg-[#FFF6F1]"
                            : disabled
                              ? "border-[#ECE3DC] bg-[#FAF7F4] opacity-60"
                              : "border-[#E3D7CF] bg-white hover:border-[#C96F5A]/55"
                        }`}
                      >
                        <div className="mb-2 flex gap-1.5">
                          {template.colors.map((color) => (
                            <span
                              key={`${template.id}-${color}`}
                              className="h-4 w-4 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <p className="text-sm font-semibold text-[#233754]">{template.name}</p>
                        <p className="text-xs text-[#63718B]">{template.description}</p>
                        {disabled && (
                          <p className="mt-1 text-[11px] font-semibold text-[#A46D5C]">
                            Disponible en plan superior
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <aside className="rounded-2xl border border-[#E8DDD6] bg-[#FCFAF8] p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[#8A6A5E]">Resumen</p>
                <h4 className="mt-1 font-heading text-2xl text-[#1D2E4B]">{selectedPlan.name}</h4>
                <p className="text-sm text-[#5A6A84]">{selectedPlan.subtitle}</p>

                <div className="mt-5 space-y-2 text-sm text-[#344662]">
                  <p className="flex items-center justify-between">
                    <span>Límite de fotos</span>
                    <strong>
                      {isUnlimitedPhotosPlan(selectedPlan.maxPhotos)
                        ? "Ilimitadas"
                        : `${selectedPlan.maxPhotos} fotos`}
                    </strong>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>QR invitados</span>
                    <strong>Incluido</strong>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>Plantillas activas</span>
                    <strong>{selectedPlanLevel === 1 ? "1" : selectedPlanLevel === 2 ? "3" : "Todas"}</strong>
                  </p>
                </div>

                <div className="mt-5 rounded-xl bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.11em] text-[#8A6A5E]">Total</p>
                  <p className="mt-1 font-heading text-4xl text-[#1D2E4B]">
                    ${selectedPlan.priceMx.toLocaleString()} <span className="text-base">MXN</span>
                  </p>
                  <p className="text-xs text-[#687690]">Pago único</p>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={loadingPlan !== null || !albumTitle.trim()}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1D2E4B] px-5 py-3.5 font-semibold text-white transition hover:bg-[#283F63] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingPlan === selectedPlanId ? "Procesando..." : "Crear mi álbum"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </aside>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
