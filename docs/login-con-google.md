# Encender el login con Google

Valores reales de Blue Book. Verificado contra documentación oficial el 23-sep-2026.

**Las etiquetas de la interfaz van en inglés.** La ayuda de Google en español
(`?hl=es`) sigue devolviendo los nombres de botón en inglés, así que no me invento
traducciones: si tu consola está traducida, busca por posición, no por texto.

---

## Antes de empezar: dos cosas que NO hacen falta

Casi todas las guías de internet te mandan a hacer estas dos, y en este caso son
trabajo tirado:

**No hace falta añadir usuarios de prueba, ni publicar la app para que entren las
novias.** Blue Book solo pide `openid`, `userinfo.email` y `userinfo.profile`, y
para ese subconjunto exacto Google tiene una excepción literal:

> «The only exception to this behavior is if your app requests a subset of the
> following: name, email address, and user profile (through the
> `userinfo.email, userinfo.profile, openid` scopes or their OpenID Connect
> equivalents). For such requests, your users do not need to be in the trusted
> user list, they will not see a warning message, and their authorizations will
> not expire after 7 days.»
> — <https://support.google.com/cloud/answer/15549945>

O sea: en estado *Testing*, con estos tres permisos, cualquier cuenta de Google
entra, sin pantalla de aviso y sin caducidad a los 7 días. Publicar sigue siendo
buena idea por higiene, pero no es lo que desbloquea nada.

**No hace falta habilitar ninguna API.** Ni Google+ (apagada en 2019) ni People
API. El correo y el nombre vienen dentro del ID token.

---

## Paso 0 — El proyecto de Google Cloud

Crea uno **nuevo**: <https://console.cloud.google.com/projectcreate>, nómbralo
`blue-book-login`. Es gratis y no pide tarjeta.

Tienes ya dos proyectos de Google y ninguno es el adecuado:

- `bodas-483516` — el de la cuenta de servicio de Google Sheets. Comprobado en
  `wedding-whatsapp/lib/google-sheets-sync.ts:12`: usa `GoogleAuth` con
  credenciales de cuenta de servicio, que **no** tocan la pantalla de
  consentimiento. Reutilizarlo probablemente funcionaría, pero no puedo ver su
  configuración desde aquí y un proyecto nuevo cuesta cero.
- `indigo-tracker-474612-r6` — no es tuyo de este producto: es de **medu.ai**.

> **De paso:** en la carpeta raíz `BlueBook Full/` hay dos archivos de
> credenciales sueltos, `client_secret_2_773488919977-….json` (cliente OAuth de
> medu.ai, **con el secreto en claro**) y `bodas-483516-90d9cf499bda.json` (llave
> privada de la cuenta de servicio). No los rastrea git —están fuera de los dos
> repos— así que no hay fuga, pero muévelos a tu gestor de contraseñas.

---

## Paso 1 — Copia la URL de retorno desde Supabase (primero esto)

<https://supabase.com/dashboard/project/hfuzpytneligrlszypno/auth/providers> →
busca **Google** en la lista y despliégalo. Ahí verás el campo **Callback URL
(for OAuth)** con un botón de copiar:

```
https://hfuzpytneligrlszypno.supabase.co/auth/v1/callback
```

Cópialo, no lo teclees. **Deja esta pestaña abierta**, vuelves en el paso 5.

Se hace primero para no tener que ir y volver: es el único valor que Google te va
a pedir y que no existe en Google.

---

## Paso 2 — El asistente de Google Auth Platform

<https://console.cloud.google.com/auth/overview> con tu proyecto nuevo
seleccionado en la barra de arriba (compruébalo en **todos** los pasos).

Estas páginas ya **no** están debajo de «APIs & Services»: Google les dio sección
propia de primer nivel. En un proyecto nuevo sale un botón **Get started**, y
hasta que no lo completes, **Clients no te deja crear nada**.

| Pantalla | Valor |
|---|---|
| App name | `Blue Book` — sin «Web»: es lo que lee la novia |
| User support email | un buzón que no te importe que vean las novias (se muestra) |
| Audience | **External** — *Internal* solo existe con Workspace y dejaría fuera a todas |
| Contact information | `maupeon@gmail.com` — este es interno, solo avisos de Google |

---

## Paso 3 — Branding: dominios autorizados **antes** que las URLs

<https://console.cloud.google.com/auth/branding>. El orden es obligatorio, lo dice
Google literal:

> «Add your Authorized Domains before you add your redirect or origin URIs, your
> homepage URL, your terms of service URL, or your privacy policy URL.»

1. **Authorized domains** → `bluebook.mx`, solo el dominio raíz, sin `https://` y
   sin `www`. Cubre automáticamente `www.` y `admin.`
   **No pongas `supabase.co`**: no es tuyo y no podrías verificarlo nunca.
2. Luego: home `https://bluebook.mx`, privacidad `https://bluebook.mx/privacidad`,
   términos `https://bluebook.mx/terminos`. **Ábrelas en producción antes de
   pegarlas** y confirma que no dan 404.
3. Logo: déjalo vacío por ahora (ver el último apartado).

---

## Paso 4 — Scopes y el cliente OAuth

**Data Access** (<https://console.cloud.google.com/auth/scopes>): tienen que
quedar exactamente tres. `userinfo.email` y `userinfo.profile` vienen por defecto;
**`openid` hay que añadirlo a mano**. Si alguno no aparece en la tabla, se pega en
la caja «Manually add scopes» — no habilites APIs buscándolo.

**Clients** (<https://console.cloud.google.com/auth/clients>) → **Create client**:

| Campo | Valor |
|---|---|
| Application type | **Web application** — decisión irreversible; con Desktop no funciona |
| Name | `Blue Book web` (interno, nadie lo ve) |
| Authorized JavaScript origins | `https://bluebook.mx` y `http://localhost:3000` — sin ruta, sin barra final |
| Authorized redirect URIs | `https://hfuzpytneligrlszypno.supabase.co/auth/v1/callback` |

En este flujo los *JavaScript origins* no intervienen (el canje lo hace el
servidor de Supabase, tu página nunca llama a Google), pero la guía oficial de
Supabase pide rellenarlos y ponerlos no rompe nada. **Cambiar ese campo nunca
arregla un `redirect_uri_mismatch`.**

**El Client Secret se ve UNA vez.** Google los guarda hasheados; después solo verás
los cuatro últimos caracteres. Pégalo en Supabase antes de cerrar el diálogo.
(Máximo dos secretos por cliente; para crear un tercero hay que borrar uno.)

---

## Paso 5 — De vuelta a Supabase

**Providers → Google**: enciende **Enable Sign in with Google**, pega Client ID y
Client Secret, **Save**. Deja **Skip nonce check** apagado — es solo para apps
nativas de iOS. Recarga la página y comprueba que siguió encendido.

**URL Configuration**
(<https://supabase.com/dashboard/project/hfuzpytneligrlszypno/auth/url-configuration>):

- **Site URL** = `https://bluebook.mx`. Ojo: esto también decide a dónde caen los
  enlaces mágicos sin `redirectTo`. Si ya estaba puesto y funcionaba, míralo antes
  de tocarlo.
- **Redirect URLs** — para producción Supabase recomienda la ruta exacta y dejar
  el comodín para local y previews:
  - `https://bluebook.mx/auth/callback`
  - `http://localhost:3000/**`
  - previews de Vercel: `https://*-<slug-de-tu-equipo>.vercel.app/**`
    El `<slug>` sale del dominio de cualquier preview (`…-<slug>.vercel.app`).
    **No pegues el marcador con `<` y `>`**: quedaría una línea que no casa con
    nada y te haría creer que está cubierto.

Si el `redirectTo` no está en esa lista, Supabase **no da error**: te deja en el
Site URL. Ese es el fallo silencioso que más cuesta diagnosticar.

`admin.bluebook.mx` no necesita nada de esto: el panel de planners no tiene ni una
llamada a `signInWithOAuth`, sigue entrando por enlace mágico.

---

## Paso 6 — Encender el botón (sin esto no se ve nada)

El botón está detrás de una bandera a propósito.

**Local:** en `bluebook/.env.local` pon `NEXT_PUBLIC_GOOGLE_LOGIN=1` y **reinicia**
`npm run dev`. Las `NEXT_PUBLIC_` se incrustan al compilar, no se recargan en
caliente.

**Producción:** Vercel → proyecto → Settings → Environment Variables →
`NEXT_PUBLIC_GOOGLE_LOGIN` = `1` en Production (y Preview) → **y redesplegar**.
Guardar la variable sola no hace nada.

Enciéndela **después** de guardar el proveedor en Supabase, nunca antes.

---

## Paso 7 — Probar

En incógnito, `http://localhost:3000/acceso` primero. Si Next arrancó en el 3001
porque el admin ocupaba el 3000, el login fallará en silencio: `redirectTo` sería
`localhost:3001`, que no está en la lista.

La prueba que de verdad importa: **entra con Google usando un correo que ya tenga
usuario creado por código.** Debe caer en el mismo usuario, no crear otro. Supabase
lo hace solo:

> «Supabase Auth automatically links identities with the same email address to a
> single user» — y solo si el correo viene verificado, que es el caso de Google.

Compruébalo en Authentication → Users: deben seguir siendo 4 usuarios, con una
segunda identidad `google` en el que usaste.

### Si algo falla

| Lo que ves | Qué es |
|---|---|
| `Error 400: redirect_uri_mismatch` | la URI de Google no coincide carácter a carácter. Puede tardar de 5 min a horas en propagar |
| `Error 401: invalid_client` | Client ID o secreto mal copiados |
| `{"msg":"Unsupported provider..."}` en fondo negro | falta guardar el proveedor en Supabase (paso 5) |
| Vuelves a bluebook.mx sin sesión, sin mensaje | el `redirectTo` no está en Redirect URLs |
| Caes en `/acceso?error=1` | falló el canje. El motivo está en los logs: busca `[auth/callback] exchangeCodeForSession falló:` |
| No aparece ningún botón | la bandera del paso 6, o falta el redeploy |

### Para deshacerlo en dos minutos

`NEXT_PUBLIC_GOOGLE_LOGIN=0` y redesplegar. El botón desaparece y todo el mundo
sigue entrando por código, que no se toca en ningún momento. **No** apagues el
proveedor en Supabase para «desactivarlo»: eso deja un botón visible que rompe feo.

---

## Lo que va a ver la novia (y esto sí es un tema aparte)

Mientras no verifiques la marca, la pantalla de Google **no dirá «Blue Book»**.
Google es explícito:

> «Without verification, only your application domain will be visible to users.»
> — <https://support.google.com/cloud/answer/15549049>

Y la documentación de Supabase dice cuál es ese dominio en su caso: Branding y
Verification sirven para «show a logo and name instead of **the Supabase project
ID** in the consent screen». O sea, la novia leerá
`hfuzpytneligrlszypno.supabase.co`.

No bloquea el login. Pero para alguien que está pagando una boda, no es un detalle
menor. Hay dos salidas, las dos independientes de todo lo anterior:

1. **Brand verification** (gratis, unos días). Requiere verificar `bluebook.mx` en
   Google Search Console como propiedad de tipo *Dominio* (registro TXT en el DNS),
   con la misma cuenta que es owner del proyecto. Luego, en Branding: **Verify
   Branding** y después **Publish branding** — son dos botones, y con solo el
   primero no se publica nada. El resultado conforme **caduca a los 7 días**: si no
   publicas dentro de esa semana, hay que volver a verificar.
2. **Custom domain de Supabase** (complemento de pago). El callback pasa a ser
   `https://auth.bluebook.mx/auth/v1/callback` y la pantalla enseña tu dominio.
   Si haces esto, **la URI de Google cambia** y hay que darla de alta otra vez.

Decide cuál antes de dar de alta el redirect URI, porque la opción 2 lo cambia.
