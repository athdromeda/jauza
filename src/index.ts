export function hello() {
  return "hello";
}

export function getEnv() {
  if (typeof window === "undefined" && typeof document === "undefined") {
    return "browser";
  } else if (
    typeof process !== "undefined" &&
    process.versions &&
    process.versions.node
  ) {
    return "node";
  }
  return "unknown";
}
