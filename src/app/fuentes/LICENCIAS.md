# Las letras hechas a mano de la marca

Las dos letras de mano de la guía de marca (28-sep-2026), en woff2 para la web.
Caveat Brush y Sacramento, sus «equivalentes digitales» según la guía, siguen en
los correos y la imagen para redes, donde no se pueden cargar estos archivos.

## BELLABOO — titulares (`bellaboo.woff2`)

- Autor: Marcelo Reis Melo, FGD (Free Goodies for Designers).
- Licencia (https://fgdesigners.com/fonts/bellaboo, consultado el 28-sep-2026):
  «Free for personal use, pay what you want for commercial work.» La licencia
  comercial se obtiene pagando cualquier cantidad al descargarla. Bellaboo Pro
  (7 USD) agrega minúsculas reales y más idiomas acentuados.
- **bluebook.mx es un uso comercial: hay que pagar la licencia antes de
  publicar.** Si se compra la Pro, reemplazar este archivo por su webfont.
- El archivo no está modificado: sólo se convirtió de OTF a woff2 (compresión).
  Le faltan `& ¿ ¡ « » “ ” – —`; esos caracteres los pone Caveat Brush, que va
  detrás en la pila de letras (ver `--font-marcador` en globals.css).

## Lazy Dog BB — frases y firma (`lazy-dog-bb.woff2`)

- Original: «Lazy Dog», © Paul Neave (http://www.neave.com/), 2001, freeware
  bajo la SIL Open Font License 1.1 (https://openfontlicense.org), que permite
  usarla, incrustarla en la web, modificarla y redistribuirla.
- Versión modificada para Blue Book, renombrada «Lazy Dog BB» como pide la OFL
  para las versiones modificadas. La original trae sólo ASCII; se agregaron,
  con los trazos de la propia fuente: á é í ó ú Á É Í Ó Ú ñ Ñ ü Ü ¿ ¡ ı · – —
  y comillas tipográficas. El script que la genera es `bluebook/scripts/acentuar_lazy_dog.py`, a partir del lazy_dog.ttf original
  (`python3 acentuar_lazy_dog.py lazy_dog.ttf lazy-dog-bb.woff2`).
- La versión modificada sigue bajo la OFL 1.1.
