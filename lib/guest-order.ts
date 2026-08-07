export type CoupleLinkedGuest = {
  id?: number;
  name: string;
  coupleId?: string;
  gender?: string;
};

export function coupleMemberKeys<T extends CoupleLinkedGuest>(items: T[]) {
  const counts = new Map<string, number>();
  for (const item of items) if (item.coupleId) counts.set(item.coupleId, (counts.get(item.coupleId) || 0) + 1);
  return new Set(Array.from(counts).filter(([, count]) => count > 1).map(([id]) => id));
}

export function orderCouplesTogether<T extends CoupleLinkedGuest>(items: T[], options: { couplesFirst?: boolean } = {}) {
  const validCouples = coupleMemberKeys(items);
  const units = new Map<string, T[]>();
  items.forEach((item, index) => {
    const key = item.coupleId && validCouples.has(item.coupleId) ? `couple:${item.coupleId}` : `solo:${item.id ?? index}`;
    units.set(key, [...(units.get(key) || []), item]);
  });
  return Array.from(units.values())
    .map(unit => unit.sort((left, right) => {
      const leftRank = left.gender === "Homme" ? 0 : left.gender === "Femme" ? 1 : 2;
      const rightRank = right.gender === "Homme" ? 0 : right.gender === "Femme" ? 1 : 2;
      return leftRank - rightRank || left.name.localeCompare(right.name, "fr", { sensitivity:"base" });
    }))
    .sort((left, right) => {
      if (options.couplesFirst && left.length !== right.length) return right.length - left.length;
      return left[0].name.localeCompare(right[0].name, "fr", { sensitivity:"base" });
    })
    .flat();
}
