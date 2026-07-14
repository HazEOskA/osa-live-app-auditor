export function createFindingIdGenerator(runId: string): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    return `${runId}-f${String(counter).padStart(3, "0")}`;
  };
}
