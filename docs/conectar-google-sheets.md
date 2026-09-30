# Encender «Traer su lista» desde Google Sheets

Pegar la lista o subir el .xlsx/.csv ya funciona sin configurar nada. Esta guía
es solo para el botón **Google Sheets**, que abre el selector de Google y lee la
hoja que la pareja elige. Nace apagado: sin estos pasos el selector truena con
«API developer key is invalid».

> **30-sep-2026.** Para llevar la lista **sincronizada** con una hoja de Google
> ya no hace falta nada de esto: en Invitados está «Su hoja de Google», donde la
> pareja comparte su hoja con la cuenta de servicio de Blue Book (la del admin)
> y pega el enlace. No usa el selector ni pide permisos de Google a la pareja.
> Ver `src/lib/hojaDeGoogle.ts` y `src/lib/hojaSincronizada.ts`. Esta guía sigue
> valiendo sólo para el botón de traerla UNA vez con el selector.

Fuentes verificadas el 27-sep-2026. Las etiquetas de la consola van en inglés,
como en `docs/login-con-google.md`.

---

## Por qué este permiso y no otro

El botón pide **`drive.file`**: solo los archivos que la pareja elige en el
selector. Blue Book no puede ver ni listar ninguna otra hoja suya.

| Permiso | Qué dice Google al usuario | Clasificación |
|---|---|---|
| `drive.file` | «See, edit, create, and delete only the specific Google Drive files you use with this app.» | **Non-sensitive** (recomendado) |
| `spreadsheets.readonly` | «See all your Google Sheets spreadsheets.» | Sensitive |

— <https://developers.google.com/workspace/sheets/api/scopes>

Lo que eso ahorra: con un permiso no sensible **no hace falta la verificación de
la app** (la de 3–5 días hábiles con video), no sale la pantalla de «app no
verificada» y no hay tope de 100 usuarios.
— <https://support.google.com/cloud/answer/13463073> y
<https://support.google.com/cloud/answer/7454865>

La app lee la hoja en el navegador (todas sus pestañas de una vez), manda al
servidor solo las celdas y **revoca el permiso enseguida**, en un `finally`,
salga bien o mal. No se guarda ningún token. Un .xlsx guardado en Drive se baja
y lo lee el servidor igual que un archivo subido.

---

## Lo que cambia respecto al login con Google

La guía del login dice que el proyecto puede quedarse en *Testing*: eso solo
vale para `openid`, `email` y `profile`. **`drive.file` no está en esa
excepción**: en Testing solo lo podrían usar hasta 100 usuarios de prueba y el
permiso caducaría a los 7 días. Por eso en el paso 4 el proyecto pasa a
**In production**, que para permisos no sensibles no pide revisión.
— <https://support.google.com/cloud/answer/15549945>

---

## Paso 1 — Las tres API

En el proyecto de Google Cloud para Sheets (uno aparte del login, ver el paso
3): **APIs & Services → Library**, y habilita:

- **Google Picker API** (el selector)
- **Google Sheets API** (leer una hoja de Google)
- **Google Drive API** (bajar un .xlsx guardado en Drive)

## Paso 2 — La llave de API del selector

**APIs & Services → Credentials → Create credentials → API key**. Luego
**Edit API key**:

- **Application restrictions → Websites**, con estas cuatro:
  - `https://www.bluebook.mx/*`
  - `https://bluebook.mx/*`
  - `https://docs.google.com/*`
  - `http://localhost:3000/*` (para probar en local)

  `docs.google.com` **no es opcional**: el selector se pinta en un iframe de ese
  dominio y sin él sale «API developer key is invalid».
  — <https://developers.google.com/workspace/drive/picker/guides/web-picker>
- **API restrictions → Restrict key → Google Picker API**.

Esta llave va en el navegador, como en cualquier sitio que usa el selector: la
protege la restricción por sitio, no el secreto.

## Paso 3 — El cliente OAuth

**Recomendado: un proyecto de Google Cloud aparte** (p. ej. `blue-book-sheets`),
con su propio cliente web. Motivo: al terminar de leer, la app revoca el
permiso, y la revocación de Google quita **todos** los permisos que la persona
le dio a esa app:

> «The revoke method revokes all of the scopes that the user granted to the app»
> — <https://developers.google.com/identity/oauth2/web/reference/js-reference>

Con el mismo cliente del login, una pareja que entra con Google vería otra vez
la pantalla de permisos de Blue Book la siguiente vez que entre. Con un
proyecto aparte, el login no se entera. (Dos clientes del MISMO proyecto pueden
contar como la misma app: por eso proyecto aparte, no solo cliente aparte.)
Si aun así se reutiliza el cliente del login, funciona; solo pasa eso.

**Credentials → Create credentials → OAuth client ID → Web application.** En
**Authorized JavaScript origins**:

- `https://www.bluebook.mx`
- `https://bluebook.mx`
- `http://localhost:3000`

No lleva *redirect URIs*: el permiso se pide en una ventana. Copia el
**Client ID**. Si usas proyecto aparte, los pasos 1, 2, 4 y 5 van en ese
proyecto.

## Paso 4 — La pantalla de consentimiento

**Google Auth Platform → Data Access → Add or remove scopes**: agrega
`.../auth/drive.file` (sale en la sección de no sensibles). Guarda.

**Audience → Publishing status → Publish app** (pasa a *In production*). Con
permisos no sensibles no hay revisión.

## Paso 5 — El número del proyecto

**IAM & Admin → Settings → Project number**. El selector lo usa como *App ID*
para que la app pueda abrir el archivo elegido.
— <https://developers.google.com/workspace/drive/picker/guides/web-picker>

## Paso 6 — Encender el botón

Vercel → proyecto `bluebook` → Settings → Environment Variables, **solo en
Production**. En Preview el botón aparecería y fallaría siempre: los dominios
`*.vercel.app` no están en los orígenes del paso 3 ni en la llave del paso 2, y
Google no acepta comodines. Para probar en un Preview, agrega su dominio fijo
(el alias de la rama) en los dos lugares.

```
NEXT_PUBLIC_GOOGLE_SHEETS=1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<Client ID del paso 3>
NEXT_PUBLIC_GOOGLE_API_KEY=<llave del paso 2>
NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER=<número del paso 5>
```

**Y redespliega**: las `NEXT_PUBLIC_` se incrustan al compilar. Si falta
cualquiera de las cuatro, el botón no aparece (`src/lib/googleSheets.ts`).

## Paso 7 — Probar

En `/panel/invitados` → **Traer su lista → Google Sheets → Elegir su hoja de
Google**. Debe pedir la cuenta, luego el permiso («solo los archivos que uses
con esta app»), abrir el selector y, al elegir la hoja, enseñar la vista previa.

Prueba también un **.xlsx guardado en Drive**: se baja y lo lee el servidor
igual que un archivo subido.

### Si algo falla

- **«API developer key is invalid»**: falta `docs.google.com/*` en la llave, o
  la llave no permite Google Picker API.
- **La ventana de Google se cierra sola o dice `origin_mismatch`**: falta el
  dominio exacto en *Authorized JavaScript origins* (con y sin `www`).
- **«Access blocked» o avisos de app en prueba**: el proyecto sigue en
  *Testing* (paso 4).
- **Cuentas de empresa (Google Workspace)**: su administrador puede bloquear
  apps de terceros. Para esas parejas quedan pegar o subir el archivo.
