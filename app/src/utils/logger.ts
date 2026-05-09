// Tiny, tag-prefixed logger so console output stays readable as the app grows.

type Level = 'debug' | 'info' | 'warn' | 'error';

function fmt(level: Level, tag: string, args: unknown[]): unknown[] {
  const ts = new Date().toISOString().slice(11, 23);
  return [`[${ts}] ${level.toUpperCase()} [${tag}]`, ...args];
}

export function logger(tag: string) {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    debug: (...a: any[]) => __DEV__ && console.log(...fmt('debug', tag, a)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    info: (...a: any[]) => console.log(...fmt('info', tag, a)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    warn: (...a: any[]) => console.warn(...fmt('warn', tag, a)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: (...a: any[]) => console.error(...fmt('error', tag, a)),
  };
}
