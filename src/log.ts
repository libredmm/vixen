import { createConsola, LogLevels } from "consola";

export const logger = createConsola({ level: LogLevels.info });

export function setLevel(opts: { verbose?: boolean; quiet?: boolean }) {
  if (opts.verbose) logger.level = LogLevels.debug;
  if (opts.quiet) logger.level = LogLevels.warn;
}
