// Convenience function for asynchronous testing
export function timeout(timeoutMs, fn) {
  return () => {
    //@ts-ignore Cross Runtime
    let to;
    return new Promise((resolve, reject) => {
      fn(resolve, reject);
      to = setTimeout(() => {
        reject(new Error("Timeout"));
      }, timeoutMs);
    }).finally(() => {
      clearTimeout(to);
    });
  };
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
