const UNITS_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** Converte durações curtas ("15m", "7d", "30s") para milissegundos. */
export function parseDurationToMs(value: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(value.trim());

  if (!match) {
    throw new Error(`Formato de duração inválido: "${value}"`);
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  return amount * UNITS_MS[unit];
}
