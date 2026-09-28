"use client";

import { useMemo, useState } from "react";
import {
  Camera,
  Check,
  Crown,
  Images,
  QrCode,
  ScanLine,
  Share2,
  ShieldCheck,
  Smartphone,
  UploadCloud,
} from "lucide-react";
import {
  AlbumPlanId,
  getLocalizedAlbumPlans,
  isUnlimitedPhotosPlan,
} from "@/lib/albumPlans";
import { parseJsonSafe, summarizeHttpError } from "@/lib/http";
import { useLanguage } from "@/components/LanguageProvider";
import { Titular } from "@/components/marca/Titular";
import { Arrow, ButtonLink, Em, Eyebrow, Heading, Lead } from "@/components/marketing/ui";

type Template = {
  id: string;
  name: string;
  description: string;
  colors: string[];
  level: 1 | 2 | 3;
};

/*
 * Las muestras son los colores de verdad de cada plantilla: los mismos que
 * pinta components/Flipbook.tsx (si cambia uno, cambian los dos). Editorial
 * es la del plan de entrada y la que se usa por defecto, y es la marca: papel
 * azul, azul línea y azul noche. Las demás son de la pareja y conservan su
 * paleta; Nocturna ya no es casi negro sino azul noche.
 */
const templates: Template[] = [
  {
    id: "classic",
    name: "Editorial",
    description: "Limpia y elegante",
    colors: ["var(--papel)", "var(--linea)", "var(--noche)"],
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
    colors: ["var(--noche)", "#B08968", "var(--niebla)"],
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

const templateTranslations: Record<string, { enName: string; enDescription: string }> = {
  classic: { enName: "Editorial", enDescription: "Clean and elegant" },
  modern: { enName: "Modern", enDescription: "Minimal and balanced" },
  romantic: { enName: "Romantic", enDescription: "Soft and warm" },
  elegant: { enName: "Night", enDescription: "Luxury contrast" },
  rustic: { enName: "Earth", enDescription: "Natural and organic" },
};

// Los <button> de esta página con la receta de ButtonLink
// (components/marketing/ui.tsx); los enlaces usan ButtonLink directamente.
const BOTON =
  "group inline-flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-medium " +
  "transition-[background-color,border-color,color,scale] duration-150 active:scale-[0.97] active:duration-100 " +
  "motion-reduce:active:scale-100";
const BOTON_PRINCIPAL = `${BOTON} bg-noche text-niebla hover:bg-noche-suave`;
const BOTON_SECUNDARIO = `${BOTON} border border-linea-control/60 bg-niebla text-noche hover:border-linea-control hover:bg-papel-medio`;

export default function AlbumDigitalPage() {
  const { language, isEnglish } = useLanguage();
  const [loadingPlan, setLoadingPlan] = useState<AlbumPlanId | null>(null);
  const [albumTitle, setAlbumTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const [selectedPlanId, setSelectedPlanId] = useState<AlbumPlanId>("album_200");
  const [showForm, setShowForm] = useState(false);

  const localizedPlans = useMemo(
    () => getLocalizedAlbumPlans(language),
    [language]
  );

  const selectedPlan = useMemo(
    () => localizedPlans.find((plan) => plan.id === selectedPlanId)!,
    [localizedPlans, selectedPlanId]
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
      alert(isEnglish ? "Please add a title for your album." : "Por favor, agrega un titulo para tu album.");
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
          isEnglish ? "Unable to start payment" : "No se pudo iniciar el pago"
        );
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Error en checkout:", error);
      alert(isEnglish ? "Connection error. Please try again." : "Error de conexion. Intenta nuevamente.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    // Las secciones alternan los dos papeles: niebla para el álbum (que es
    // foto), papel azul para lo informativo (precios, el pago). Sin las
    // manchas de color ni el crema de fondo.
    <div className="pt-16 overflow-hidden bg-niebla">
      <section className="bg-niebla px-4 pt-12 pb-14 sm:px-6 sm:pt-16 sm:pb-20">
        <div className="mx-auto max-w-6xl">
          {/* El encabezado va centrado y arriba de las dos columnas. El
              titular es largo (53 caracteres): a tamaño de sección cabe en
              dos líneas desde 768px; a tamaño de portada serían tres a
              1024px. */}
          <div className="mx-auto max-w-4xl text-center">
            <Eyebrow>{isEnglish ? "Blue Book digital album" : "Album digital bluebook"}</Eyebrow>

            <Titular as="h1" tamano="seccion" className="mt-4">
              {isEnglish ? "Your wedding in a mobile album," : "Tu boda en un album movil,"}{" "}
              <Em>{isEnglish ? "ready to share with QR" : "listo para compartir por QR"}</Em>
            </Titular>

            <Lead className="mx-auto mt-6 max-w-2xl">
              {isEnglish
                ? "Designed for mobile with an editorial romantic aesthetic. Your guests scan, upload photos, and your memories are built in real time."
                : "Disenado para celular, inspirado en una estetica editorial romantica. Tus invitados escanean, suben sus fotos y el recuerdo se arma en tiempo real."}
            </Lead>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={() => {
                  document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`${BOTON_PRINCIPAL} px-7 py-3.5`}
              >
                {isEnglish ? "Choose plan" : "Elegir plan"}
                <Arrow />
              </button>
              <ButtonLink href="/precios" variant="secondary">
                {isEnglish ? "View full comparison" : "Ver comparativa completa"}
              </ButtonLink>
            </div>
          </div>

          <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {[
                { icon: QrCode, text: isEnglish ? "QR for guests in every plan" : "QR para invitados en todos los planes" },
                { icon: Images, text: isEnglish ? "50, 200, or unlimited photos" : "50, 200 o fotos ilimitadas" },
                { icon: Smartphone, text: isEnglish ? "Mobile-first experience" : "Experiencia optimizada para movil" },
                { icon: ShieldCheck, text: isEnglish ? "One-time payment and lifetime access" : "Pago unico y acceso de por vida" },
              ].map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-2.5 rounded-2xl border border-linea bg-papel px-4 py-3 text-sm font-medium text-noche"
                >
                  <item.icon className="h-4 w-4 shrink-0 text-tinta" aria-hidden="true" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>

            {/* Los pasos son información: papel azul sobre el niebla de la
                sección. El bloque de arriba era una tarjeta azul oscuro, y en
                la marca no hay superficies oscuras. */}
            <div className="mx-auto w-full max-w-md rounded-[32px] border border-linea bg-papel p-5">
              <div className="rounded-3xl bg-niebla p-5">
                <p className="rotulo">
                  {isEnglish ? "Guest flow" : "Flujo de invitados"}
                </p>
                <h3 className="mt-2 text-xl font-medium text-noche">{isEnglish ? "Scan and upload" : "Escanean y suben"}</h3>
                <p className="mt-2 text-sm text-tinta">
                  {isEnglish
                    ? "From your dashboard you generate a QR to share during the event. Each guest opens a mobile-ready upload page."
                    : "Desde tu panel generas un QR para compartir durante el evento. Cada invitado entra a una pagina de carga lista para movil."}
                </p>
              </div>

              <div className="mt-4 space-y-3">
                {[
                  { icon: ScanLine, title: isEnglish ? "1. Share the QR" : "1. Compartes QR", body: isEnglish ? "At your gift table, dance floor, or invitation" : "En mesa de regalos, pista o invitacion" },
                  { icon: UploadCloud, title: isEnglish ? "2. Guests upload photos" : "2. Suben fotos", body: isEnglish ? "No app required, straight from their phone" : "Sin app, directo desde su celular" },
                  { icon: Camera, title: isEnglish ? "3. Curate the album" : "3. Curas el album", body: isEnglish ? "Organize everything in an elegant flipbook" : "Ordenas todo en un flipbook elegante" },
                ].map((step) => (
                  <div
                    key={step.title}
                    className="rounded-2xl border border-linea bg-niebla p-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-papel p-2 text-tinta">
                        <step.icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-noche">{step.title}</p>
                        <p className="text-xs text-tinta">{step.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Precios: papel azul. El plan destacado se marca con borde azul
          noche y su rótulo, no con un fondo oscuro; su botón es el único
          lleno de la sección. */}
      <section id="pricing" className="bg-papel px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-12">
            <Eyebrow>
              {isEnglish ? "Digital album plans" : "Planes del album digital"}
            </Eyebrow>
            <Heading className="mt-4">
              {isEnglish ? "3 plans, all with guest QR" : "3 planes, todos con QR para invitados"}
            </Heading>
            <Lead className="mx-auto mt-4 max-w-2xl">
              {isEnglish
                ? "Choose by photo volume. Album experience and QR flow are included from the entry plan."
                : "Elige por volumen de fotos. La experiencia del album y el flujo QR estan incluidos desde el plan de entrada."}
            </Lead>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {localizedPlans.map((plan) => (
              <article
                key={plan.id}
                className={`rounded-3xl bg-niebla p-6 shadow-sm ${
                  plan.featured
                    ? "border-2 border-noche"
                    : "border border-linea"
                }`}
              >
                {plan.badge && (
                  <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-noche px-3 py-1 text-xs font-medium text-niebla">
                    <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                    {plan.badge}
                  </div>
                )}

                <p className="rotulo">
                  {plan.subtitle}
                </p>
                <h3 className="mt-2 text-2xl font-medium text-noche">{plan.name}</h3>
                <p className="mt-2 text-sm text-tinta">{plan.description}</p>

                {/* El precio en Work Sans ligera a tamaño grande, con
                    números tabulares: nunca en script ni en marcador. */}
                <div className="mt-6 flex items-end gap-2">
                  <span className="text-5xl text-noche tabular-nums">${plan.priceMx.toLocaleString()}</span>
                  <span className="mb-1 text-sm text-tinta">MXN</span>
                </div>

                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-papel px-3 py-1.5 text-xs font-medium text-noche">
                  <Images className="h-3.5 w-3.5" aria-hidden="true" />
                  {plan.maxPhotosLabel}
                </div>

                <ul className="mt-5 space-y-2.5 text-sm text-tinta">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-papel">
                        <Check className="h-3.5 w-3.5 text-tinta" aria-hidden="true" />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`mt-6 w-full px-5 py-3.5 ${plan.featured ? BOTON_PRINCIPAL : BOTON_SECUNDARIO}`}
                >
                  {isEnglish ? "Choose this plan" : "Elegir este plan"}
                  <Arrow />
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-niebla px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-12">
            <Eyebrow>
              {isEnglish ? "Included in every plan" : "Incluido en todos los planes"}
            </Eyebrow>
            <Heading className="mt-4">
              {isEnglish ? "Guest QR module" : "Modulo QR de invitados"}
            </Heading>
            <Lead className="mx-auto mt-4 max-w-2xl">
              {isEnglish
                ? "Inside the admin panel you can create invitations, open their QR, download it, and share it by WhatsApp or with the phone share button."
                : "Dentro del panel de administracion puedes generar invitaciones, abrir su QR, descargarlo y compartirlo por WhatsApp o desde el boton compartir del celular."}
            </Lead>
          </div>

          <div className="grid gap-7 lg:grid-cols-2 lg:items-center">
            <div className="mx-auto w-full max-w-md space-y-3">
              {[
                isEnglish ? "One QR per guest or a universal one for the full event" : "Un QR por invitado o uno general para toda la fiesta",
                isEnglish ? "Control how many photos each guest can upload" : "Control de cuantas fotos sube cada invitado",
                isEnglish ? "Everything goes into one album so you can curate at the end" : "Todo entra al mismo album para que lo ordenes al final",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5 text-sm text-tinta">
                  <div className="mt-0.5 shrink-0 rounded-full bg-papel p-1 text-tinta">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* Maqueta de la invitación del panel: papel azul con su hoja
                niebla, como se ve de verdad. */}
            <div className="mx-auto w-full max-w-md rounded-3xl border border-linea bg-papel p-5">
              <div className="flex items-center justify-between rounded-2xl bg-niebla p-4">
                <div>
                  <p className="rotulo">
                    {isEnglish ? "Invitation ready" : "Invitacion lista"}
                  </p>
                  <p className="text-xl font-medium text-noche">
                    {isEnglish ? "Main table" : "Mesa principal"}
                  </p>
                </div>
                <div className="rounded-xl bg-papel p-2 text-tinta">
                  <QrCode className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button className={`${BOTON_PRINCIPAL} px-3 py-2.5`}>
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  {isEnglish ? "Share" : "Compartir"}
                </button>
                <button className={`${BOTON_SECUNDARIO} px-3 py-2.5`}>
                  <QrCode className="h-4 w-4" aria-hidden="true" />
                  {isEnglish ? "Download QR" : "Descargar QR"}
                </button>
              </div>

              <p className="mt-4 text-xs text-tinta">
                {isEnglish
                  ? "In production, this block is generated automatically from each invitation in the admin panel."
                  : "En produccion, este bloque se genera automaticamente desde cada invitacion del panel admin."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* El pago: papel azul, con la hoja niebla y los campos en papel azul
          dentro de ella. */}
      {showForm && (
        <section id="album-form" className="bg-papel px-4 py-14 sm:px-6 sm:py-20">
          <div className="panel-card mx-auto max-w-4xl p-6 sm:p-8">
            {/* El corazón que acompañaba al título sobra: el titular trae
                los suyos. */}
            <div className="mb-8 text-center">
              <Eyebrow>Checkout</Eyebrow>
              <Titular as="h2" tamano="hoja" className="mt-3">
                {isEnglish ? "Customize your album" : "Personaliza tu album"}
              </Titular>
            </div>

            <div className="grid gap-7 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <label htmlFor="album-title" className="mb-2 block text-sm font-medium text-noche">
                  {isEnglish ? "Album title" : "Titulo del album"}
                </label>
                <input
                  id="album-title"
                  value={albumTitle}
                  onChange={(event) => setAlbumTitle(event.target.value)}
                  placeholder={isEnglish ? "Ex. Fernanda & Miguel - Nov 23" : "Ej. Fernanda & Miguel - 23 Nov"}
                  maxLength={100}
                  className="w-full rounded-2xl border border-linea-control bg-papel px-4 py-3.5 text-sm text-noche outline-none transition-[border-color,box-shadow] focus:border-noche focus:ring-2 focus:ring-noche/20"
                />

                <p className="mt-5 mb-2 text-sm font-medium text-noche">
                  {isEnglish ? "Template" : "Plantilla"}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {templates.map((template) => {
                    const disabled = !canUseTemplate(template, selectedPlanId);
                    const selected = selectedTemplate === template.id;

                    return (
                      <button
                        key={template.id}
                        disabled={disabled}
                        onClick={() => setSelectedTemplate(template.id)}
                        className={`rounded-2xl border p-3 text-left transition-[border-color,background-color] duration-150 ${
                          selected
                            ? "border-noche bg-papel ring-1 ring-noche"
                            : disabled
                              ? "cursor-not-allowed border-linea bg-niebla opacity-60"
                              : "border-linea bg-niebla hover:border-linea-control hover:bg-papel-medio"
                        }`}
                      >
                        <div className="mb-2 flex gap-1.5">
                          {template.colors.map((color) => (
                            <span
                              key={`${template.id}-${color}`}
                              className="h-4 w-4 rounded-full border border-linea"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <p className="text-sm font-medium text-noche">
                          {isEnglish ? templateTranslations[template.id].enName : template.name}
                        </p>
                        <p className="text-xs text-tinta">
                          {isEnglish ? templateTranslations[template.id].enDescription : template.description}
                        </p>
                        {disabled && (
                          <p className="mt-1 text-[11px] font-medium text-noche">
                            {isEnglish ? "Available on higher plan" : "Disponible en plan superior"}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <aside className="rounded-2xl border border-linea bg-papel p-4">
                <p className="rotulo">
                  {isEnglish ? "Summary" : "Resumen"}
                </p>
                <h4 className="mt-1 text-xl font-medium text-noche">{selectedPlan.name}</h4>
                <p className="text-sm text-tinta">{selectedPlan.subtitle}</p>

                <div className="mt-5 space-y-2 text-sm text-tinta">
                  <p className="flex items-center justify-between">
                    <span>{isEnglish ? "Photo limit" : "Limite de fotos"}</span>
                    <strong className="text-noche tabular-nums">
                      {isUnlimitedPhotosPlan(selectedPlan.maxPhotos)
                        ? (isEnglish ? "Unlimited" : "Ilimitadas")
                        : `${selectedPlan.maxPhotos} ${isEnglish ? "photos" : "fotos"}`}
                    </strong>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>{isEnglish ? "Guest QR" : "QR invitados"}</span>
                    <strong className="text-noche">{isEnglish ? "Included" : "Incluido"}</strong>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>{isEnglish ? "Active templates" : "Plantillas activas"}</span>
                    <strong className="text-noche tabular-nums">{selectedPlanLevel === 1 ? "1" : selectedPlanLevel === 2 ? "3" : (isEnglish ? "All" : "Todas")}</strong>
                  </p>
                </div>

                <div className="mt-5 rounded-xl bg-niebla p-4">
                  <p className="rotulo">Total</p>
                  <p className="mt-1 text-4xl text-noche tabular-nums">
                    ${selectedPlan.priceMx.toLocaleString()} <span className="text-base text-tinta">MXN</span>
                  </p>
                  <p className="text-xs text-tinta">{isEnglish ? "One-time payment" : "Pago unico"}</p>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={loadingPlan !== null || !albumTitle.trim()}
                  className={`${BOTON_PRINCIPAL} mt-5 w-full px-5 py-3.5 disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {loadingPlan === selectedPlanId
                    ? (isEnglish ? "Processing..." : "Procesando...")
                    : (isEnglish ? "Create my album" : "Crear mi album")}
                  <Arrow />
                </button>
              </aside>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
