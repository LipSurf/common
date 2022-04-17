import { copy } from "https://deno.land/std@0.103.0/io/util.ts";
const PACKAGE_DIRS = [
  "types",
  "cli",
  "common",
  "premium-plugins",
  "plugins",
  "extension",
].map((x) => `./packages/${x}`);

export async function checkDiff() {
  const p = Deno.run({
    cmd: [
      "git",
      "diff-index",
      "--ignore-submodules",
      "--ignore-space-at-eol",
      "--quiet",
      "HEAD",
      "--",
      ...PACKAGE_DIRS,
    ],
  });

  // await its completion
  const { code } = await p.status();
  if (code === 0) console.log(`No uncommited changes, continuing`);
  else {
    await runCmdsInCwd(["git", "status"]);
    await runCmdsInCwd(["git", "diff"]);
    throw new Error(
      `Uncommitted changes in one of these dirs ${PACKAGE_DIRS}, aborting`
    );
  }
}

export class NonZeroReturnStatusError extends Error {}

export function echoRm(...paths: string[]) {
  if (paths.length) console.log(`Removing ${paths.join(", ")}`);
  return Promise.all(paths.map((path) => Deno.remove(path)));
}

export function runCmdsInCwd(...cmdArrs: string[][]) {
  return runCmds(undefined, ...cmdArrs);
}

export async function runCmds(
  options: { cwd: string; env?: any } = { cwd: ".", env: {} },
  ...cmdArrs: string[][]
) {
  for (const cmdArr of cmdArrs) {
    const p = await Deno.run({
      env: options.env,
      cmd: cmdArr,
      cwd: options.cwd,
      stderr: "piped",
      stdout: "piped",
    });

    copy(p.stdout, Deno.stdout);
    copy(p.stderr, Deno.stderr);

    const { code } = await p.status();
    if (code !== 0) {
      throw new NonZeroReturnStatusError(
        `Error running ${cmdArr}. \nerr:\n${code}`
      );
    }
  }
}
