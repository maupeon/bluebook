import { cookies } from "next/headers";
import { Titular } from "@/components/marca/Titular";
import { ButtonLink, Container, Eyebrow, Lead } from "@/components/marketing/ui";
import { LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";

/*
 * La página que no existe. Sin este archivo Next pinta la suya: negra, en la
 * letra del sistema y en inglés. Aquí es una pantalla de un solo foco, en
 * papel azul y centrada: dónde estás, y el único camino de vuelta.
 */
export default async function NotFound() {
  const en = parseLanguage((await cookies()).get(LANGUAGE_COOKIE)?.value) === "en";
  return (
    <section className="bg-papel pb-24 pt-36 sm:pt-44">
      <Container className="flex max-w-2xl flex-col items-center text-center">
        <Eyebrow>404</Eyebrow>
        <Titular as="h1" tamano="portada" className="mt-4">
          {en ? "This page doesn't exist" : "Esta página no existe"}
        </Titular>
        <Lead className="mt-6 max-w-md">
          {en
            ? "The link may be mistyped, or the page may have moved."
            : "Puede que el enlace esté mal escrito o que la página se haya movido."}
        </Lead>
        <ButtonLink href="/" className="mt-10">
          {en ? "Back to home" : "Volver al inicio"}
        </ButtonLink>
        <p aria-hidden="true" className="frase mt-12 text-[2rem] text-tinta">
          Something blue.
        </p>
      </Container>
    </section>
  );
}
