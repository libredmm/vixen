export let verbose = false;

export function setVerbose(v: boolean) {
  verbose = v;
}

export function vlog(msg: string) {
  if (verbose) console.log(msg);
}
