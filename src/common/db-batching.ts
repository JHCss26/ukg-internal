export function splitIntoBatches<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function computeSafeBatchSize(columnsPerRow: number, safety = 1800) {
  // MERGE often binds ~2 params per column + overhead; keep well under 2100
  const paramsPerRow = Math.max(1, columnsPerRow * 2 + 6);
  return Math.max(1, Math.floor(safety / paramsPerRow));
}