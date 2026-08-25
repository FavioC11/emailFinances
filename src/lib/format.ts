const currency = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

export const formatMoney = (n: number) => currency.format(n);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Lima",
  });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Lima",
  });
