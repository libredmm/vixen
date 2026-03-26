enum Level {
	debug = 0,
	info = 1,
	success = 1,
	warn = 2,
	error = 3,
}

const COLORS: Record<string, string> = {
	debug: "\x1b[90m", // gray
	info: "\x1b[36m", // cyan
	success: "\x1b[32m", // green
	warn: "\x1b[33m", // yellow
	error: "\x1b[31m", // red
};
const RESET = "\x1b[0m";

function log(level: Level, tag: string, msg: string) {
	if (level < logger.level) return;
	const color = COLORS[tag] ?? "";
	const stream = level >= Level.warn ? process.stderr : process.stderr;
	stream.write(`${color}[${tag}]${RESET} ${msg}\n`);
}

export const logger = {
	level: Level.info as number,
	debug: (msg: string) => log(Level.debug, "debug", msg),
	info: (msg: string) => log(Level.info, "info", msg),
	success: (msg: string) => log(Level.success, "success", msg),
	warn: (msg: string) => log(Level.warn, "warn", msg),
	error: (msg: string) => log(Level.error, "error", msg),
};

export function setLevel(opts: { verbose?: boolean; quiet?: boolean }) {
	if (opts.verbose) logger.level = Level.debug;
	if (opts.quiet) logger.level = Level.warn;
}
