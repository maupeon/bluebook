# Encender «Conectar con Google» (la hoja de invitados sin compartir con nadie)

En Invitados, la pareja puede ligar su hoja de Google de dos formas:

- **Compartiéndola** con la cuenta de servicio de Blue Book y pegando el enlace.
  Funciona sin configurar nada; es la de respaldo.
- **«Conectar con Google»**: va a Google, acepta, y de vuelta elige su hoja en
  el selector de Google o deja que Blue Book le cree una. No comparte con
  ningún correo ni pega enlaces. **Nace apagada**: aparece cuando estén las
  cuatro variables del paso 6.

Esta guía es para encender la segunda. Las etiquetas de la consola van en
inglés, como en `docs/login-con-google.md`.

## Qué permiso se pide y por qué no hay revisión de Google

Sólo **`drive.file`**: los archivos que la pareja elige en el selector o crea
con Blue Book. Blue Book no puede ver ni listar nada más de su Drive. Google lo
clasifica como **no sensible**, así que no pide la verificación de la app ni
enseña la pantalla de «app no verificada» (fuentes en
`docs/conectar-google-sheets.md`). Además se pide el correo de la cuenta, para
decirle a la pareja con cuál quedó conectada.

A diferencia del login, **`drive.file` no está en la excepción de _Testing_**:
en _Testing_ sólo lo podrían usar 100 cuentas de prueba y el permiso caducaría
a los 7 días. Por eso el paso 2 publica la app.

## Paso 0 — El proyecto

Usa el mismo de entrar con Google: **`blue-book-login`**. Así la pareja ve una
sola app «Blue Book» en Google. Comprueba en todos los pasos que es el
proyecto seleccionado en la barra de arriba.

## Paso 1 — Las dos API

**APIs & Services → Library** (<https://console.cloud.google.com/apis/library>), busca y habilita:

- **Google Sheets API** (leer y escribir la hoja)
- **Google Picker API** (el selector donde la pareja elige su hoja)

## Paso 2 — El permiso y publicar la app

**Google Auth Platform → Data Access** (<https://console.cloud.google.com/auth/scopes>) **→ Add or remove scopes**: marca
`.../auth/drive.file` (sale entre los no sensibles) → **Update** → **Save**.

**Google Auth Platform → Audience** (<https://console.cloud.google.com/auth/audience>) **→ Publishing status → Publish app**. Queda
_In production_. Con permisos no sensibles no hay revisión.

En **Branding** conviene que estén: el nombre «Blue Book», el correo de
soporte, el dominio autorizado `bluebook.mx` y el aviso de privacidad
`https://www.bluebook.mx/privacidad`. Sin logotipo no pide nada más.

## Paso 3 — El cliente OAuth (de aquí salen dos llaves)

**Google Auth Platform → Clients** (<https://console.cloud.google.com/auth/clients>) **→ Create client → Web application**. Nombre:
`Blue Book — hojas`. Es un cliente NUEVO, aparte del que usa Supabase para el
login.

- **Authorized JavaScript origins**: `https://www.bluebook.mx`
- **Authorized redirect URIs** (letra por letra):
  - `https://www.bluebook.mx/api/panel/google/volver`
  - `http://localhost:3001/api/panel/google/volver` (sólo para probar en local)

**Create**. Copia el **Client ID** y el **Client secret** (el secreto sólo se
enseña al crearlo: si se pierde, se genera otro en ese mismo cliente).

## Paso 4 — La llave del selector

**APIs & Services → Credentials** (<https://console.cloud.google.com/apis/credentials>) **→ Create credentials → API key**. Luego
**Edit API key**:

- **Application restrictions → Websites**:
  - `https://www.bluebook.mx/*`
  - `https://bluebook.mx/*`
  - `https://docs.google.com/*` (no es opcional: el selector se pinta en un
    iframe de ese dominio y sin él sale «API developer key is invalid»)
  - `http://localhost:3001/*` (sólo para probar en local)
- **API restrictions → Restrict key → Google Picker API**.

Esta llave va en el navegador: la protege la restricción por sitio.

## Paso 5 — El número del proyecto

**IAM & Admin → Settings** (<https://console.cloud.google.com/iam-admin/settings>) **→ Project number** (son sólo dígitos). El selector lo
usa como _App ID_: es lo que hace que, al elegir la hoja, Blue Book pueda
abrirla.

## Paso 6 — Las cuatro variables en Vercel

Vercel → proyecto `bluebook` → Settings → Environment Variables, **sólo en
Production**:

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<Client ID del paso 3>
GOOGLE_CLIENT_SECRET=<Client secret del paso 3>      ← márcala como Sensitive
NEXT_PUBLIC_GOOGLE_API_KEY=<llave del paso 4>
NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER=<número del paso 5>
```

**Y redespliega**: las `NEXT_PUBLIC_` se incrustan al compilar. Si falta
cualquiera de las cuatro, «Conectar con Google» no aparece y el panel sigue
ofreciendo compartir la hoja.

**No pongas `NEXT_PUBLIC_GOOGLE_SHEETS=1`.** Ese es el botón viejo de «Traer
su lista → Google Sheets», que retira el permiso en cuanto termina de leer, y
retirar en Google quita TODOS los permisos que la persona le dio a la app:
desconectaría la hoja ligada.

## Paso 7 — Probar

En `/panel/invitados` → **Llevarla sincronizada con una hoja de Google →
Conectar con Google**. Debe:

1. ir a Google, pedir la cuenta y el permiso («ver y editar sólo los archivos
   que uses con esta app»);
2. volver a Invitados diciendo «Ya están conectados con Google»;
3. con **Elegir mi hoja**, abrir el selector con sus hojas de cálculo y, al
   elegir una, enseñar la vista previa de siempre;
4. con **Crear una hoja nueva**, crear «Invitados de …» en su Drive, ya con la
   lista.

### Si algo falla

- **`redirect_uri_mismatch`** al ir a Google: la dirección de vuelta del paso 3
  no coincide letra por letra (ojo con `www`, con `https` y sin diagonal al
  final).
- **«API developer key is invalid»** al abrir el selector: falta
  `docs.google.com/*` en la llave, o la llave no está restringida a Picker API.
- **El selector abre pero la hoja elegida «no se pudo abrir»**: el número del
  paso 5 no es el del proyecto del cliente OAuth, o falta habilitar Sheets API.
- **Vuelve con «Google no nos dio permiso sobre sus hojas»**: en la pantalla de
  Google se desmarcó la casilla del permiso.
- **«Access blocked: … has not completed the Google verification process»**: la
  app sigue en _Testing_ (paso 2).

## Cómo funciona por dentro

- `/api/panel/google/conectar` manda a Google; `/api/panel/google/volver` recibe
  el código, lo canjea y guarda el permiso **cifrado** en `cuentas_de_google`
  (0051, `src/lib/googleDeLaBoda.ts`, `src/lib/cifrado.ts`). La llave de cifrado
  se deriva de `GOOGLE_CLIENT_SECRET`: si se cambia el secreto, las parejas
  tienen que conectar otra vez.
- Para leer y escribir, el panel renueva un acceso de una hora y se lo manda
  al admin en cada llamada (`/api/interno/hoja`, campo `acceso`). El admin no
  guarda nada.
- Si la pareja retira el permiso (myaccount.google.com/permissions), la
  sincronización se detiene con «Volver a conectar con Google».
- Para probar en local sin llaves: `GOOGLE_SIMULADO=1` (junto con
  `HOJA_SIMULADA` en el admin). No existe en producción.
