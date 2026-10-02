export async function resolve(specifier, context, nextResolve) {
  if (specifier === "mysql2/promise") {
    return {
      shortCircuit: true,
      url: new URL("./mysql2-promise-spy.mjs", import.meta.url).href,
    };
  }
  return nextResolve(specifier, context);
}
