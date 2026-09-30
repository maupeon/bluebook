/**
 * «Conectar con Google»: la pareja le da permiso a Blue Book sobre las hojas
 * que ELIGE (o crea) con Blue Book, y así liga su lista sin compartir la hoja
 * con ningún correo (hojaDeGoogle.ts).
 *
 * Nace apagado, como el botón de entrar con Google: sin las llaves de Google
 * Cloud no hay a dónde mandar a la pareja. Estas tres van en el navegador (el
 * selector de Google las pide); la cuarta, GOOGLE_CLIENT_SECRET, sólo en el
 * servidor (googleDeLaBoda.ts). Ver docs/conectar-con-google.md.
 *
 * Mientras esté apagado, el panel ofrece el camino de siempre: compartir la
 * hoja con la cuenta de Blue Book y pegar el enlace.
 *
 * Módulo puro: lo leen el panel, el selector y el Aviso de privacidad.
 */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
export const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";
/** El número del proyecto de Google Cloud: el selector lo pide como App ID. */
export const GOOGLE_PROJECT_NUMBER = process.env.NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER ?? "";

export const CONECTAR_CON_GOOGLE_ACTIVO = Boolean(GOOGLE_CLIENT_ID && GOOGLE_API_KEY && GOOGLE_PROJECT_NUMBER);

/**
 * Lo único que se pide: los archivos que la pareja elige o crea con Blue Book
 * (Google lo clasifica como no sensible), y su correo para decirle con qué
 * cuenta quedó conectada.
 */
export const PERMISO_DE_HOJAS = "https://www.googleapis.com/auth/drive.file";
export const PERMISOS_QUE_SE_PIDEN = [PERMISO_DE_HOJAS, "openid", "email"];
