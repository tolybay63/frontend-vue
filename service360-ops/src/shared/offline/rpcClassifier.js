const MUTATION_PREFIXES = ['data/save', 'data/delete', 'data/assign'];

export function isMutation(rpcMethod) {
  if (!rpcMethod) return false;
  return MUTATION_PREFIXES.some(prefix => rpcMethod.startsWith(prefix));
}
