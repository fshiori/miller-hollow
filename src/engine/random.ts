export interface RandomSource {
  nextInt(maxExclusive: number): number;
}

export const mathRandomSource: RandomSource = {
  nextInt(maxExclusive: number): number {
    return Math.floor(Math.random() * maxExclusive);
  }
};

export function shuffleWithRandom<T>(items: readonly T[], random: RandomSource): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = random.nextInt(index + 1);
    const current = result[index] as T;
    result[index] = result[swapIndex] as T;
    result[swapIndex] = current;
  }
  return result;
}
