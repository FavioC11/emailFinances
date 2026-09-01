// Extracción de montos con detección de moneda.
//
// Antes cada parser fijaba `S\/` en su regex y `currency: "PEN"`, así que un
// consumo en dólares daba monto nulo y se perdía. Este helper reconoce el
// símbolo de moneda (S/ , US$ , $) junto al número, para que los dólares SÍ
// entren con su moneda correcta.

// Fragmentos de regex compartidos. `US\$` va antes que `\$` para que "US$"
// gane al alternar (si no, `\$` haría match del "$" dejando "US" fuera).
const CUR = String.raw`(US\$|S\/\.?|\$)`;
const NUM = String.raw`([\d,]+\.\d{2})`;

export interface Money {
  amount: number;
  currency: string; // ISO: 'PEN' | 'USD'
}

// Símbolo → código ISO. En los correos de bancos peruanos, "$" y "US$"
// siempre son dólares; "S/" (con o sin punto) son soles.
export function normalizeCurrency(symbol: string): string {
  const s = symbol.replace(/\s/g, "");
  if (/^S\//i.test(s)) return "PEN";
  return "USD"; // US$ o $
}

// Primer monto en soles (S/) que aparezca en el texto. Se usa para capturar el
// equivalente en soles que los correos de consumo en dólares suelen traer
// además del monto en US$ — así la conversión sale gratis del propio correo.
// Best-effort: si el formato real no coincide, devuelve null (nunca rompe).
export function matchPen(text: string): number | null {
  const m = text.match(new RegExp(`S\\/\\.?\\s*${NUM}`, "i"));
  return m ? Number(m[1].replace(/,/g, "")) : null;
}

// Busca el primer monto con moneda en `text`, probando cada etiqueta en orden.
// Cada `label` es un fragmento de regex ANTES de la moneda (p.ej.
// "Monto pagado", "Total del consumo", o "" para el fallback "primer monto").
// El helper añade `\s*:?\s*` entre la etiqueta y la moneda.
export function matchMoney(text: string, labels: string[]): Money | null {
  for (const label of labels) {
    const re = new RegExp(`${label}\\s*:?\\s*${CUR}\\s*${NUM}`, "i");
    const m = text.match(re);
    if (m) {
      return {
        amount: Number(m[2].replace(/,/g, "")),
        currency: normalizeCurrency(m[1]),
      };
    }
  }
  return null;
}
