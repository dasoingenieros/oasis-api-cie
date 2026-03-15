// filename-utils.ts — Normalized filenames for documents
// Format: {TypePrefix}_{NIF}_{direccion}.{ext}
// Signed: {TypePrefix}_{NIF}_{direccion}_firmado.{ext}

const TYPE_PREFIX: Record<string, string> = {
  CERTIFICADO: 'CIE',
  MEMORIA_TECNICA: 'MTD',
  SOLICITUD: 'SolicitudBT',
  UNIFILAR: 'Unifilar',
};

function sanitize(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 30);
}

function buildAddress(installation: any): string {
  const parts = [
    installation.emplazNombreVia,
    installation.emplazNumero,
  ].filter(Boolean);
  if (parts.length > 0) return sanitize(parts.join(' '));
  if (installation.address) return sanitize(installation.address);
  return 'instalacion';
}

export function buildNormalizedFilename(
  installation: any,
  type: string,
  ext = 'pdf',
  signed = false,
): string {
  const prefix = TYPE_PREFIX[type] || type;
  const nif = installation.titularNif
    ? installation.titularNif.replace(/[^a-zA-Z0-9]/g, '')
    : '';
  const addr = buildAddress(installation);
  const suffix = signed ? '_firmado' : '';
  const nifPart = nif ? `_${nif}` : '';
  return `${prefix}${nifPart}_${addr}${suffix}.${ext}`;
}
