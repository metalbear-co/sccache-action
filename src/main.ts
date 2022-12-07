import * as core from "@actions/core";
import { exec } from "@actions/exec";
import { cacheDir, downloadTool, extractTar, find } from "@actions/tool-cache";
import { promises as fs } from "fs";
import * as path from "path";

// WE're using a patched version provided on my repo because
// the original repo didn't release binaries yet with GHA support.
// Todo: make this input
const VERSION = "0.3.1-gha";
const TOOL_NAME = "sccache";

function getDownloadPath(): string {
  switch (process.platform) {
    case "darwin":
      return `https://github.com/aviramha/sccache/releases/download/v${VERSION}/sccache-v${VERSION}-x86_64-apple-darwin.tar.gz`;
    case "linux":
      return `https://github.com/aviramha/sccache/releases/download/v${VERSION}/sccache-v${VERSION}-x86_64-unknown-linux-musl.tar.gz`;
    case "win32":
      return `https://github.com/aviramha/sccache/releases/download/v${VERSION}/sccache-v${VERSION}-x86_64-pc-windows-msvc.tar.gz`;
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

async function setCache(sccacheDirectory: string): Promise<void> {
  core.debug("Configuring use of sccache from from path: " + sccacheDirectory);
  let binaryPath = path.join(sccacheDirectory, "sccache");
  if (process.platform == "win32") {
    binaryPath += ".exe";
  } else {
    await fs.chmod(binaryPath, 0o755);
  }
  core.debug("setting binary path to " + binaryPath);
  core.exportVariable("RUSTC_WRAPPER", binaryPath);
  if (!(process.env.ACTIONS_CACHE_URL && process.env.ACTIONS_RUNTIME_TOKEN)) {
    throw "Missing environment variables for cache";
  }
  core.exportVariable("ACTIONS_CACHE_URL", process.env.ACTIONS_CACHE_URL);
  core.exportVariable(
    "ACTIONS_RUNTIME_TOKEN",
    process.env.ACTIONS_RUNTIME_TOKEN
  );
  //todo: make this input
  core.exportVariable("SCCACHE_GHA_CACHE_TO", "sccache-latest");
  core.exportVariable("SCCACHE_GHA_CACHE_FROM", "sccache-");
  core.addPath(sccacheDirectory);
  exec("sccache", ["--start-server"]);
  core.debug("Configured sccache!");
}

async function guardedRun(): Promise<void> {
  core.debug("Trying to find cached sccache ;)");
  const sccacheDirectory = find(TOOL_NAME, VERSION, process.platform);
  if (sccacheDirectory) {
    core.debug("Found cached sccache");
    await setCache(sccacheDirectory);
    return;
  }
  core.debug("Downloading sccache");
  const downloadPath = await downloadTool(getDownloadPath());
  core.debug("Extracting sccache");
  const extractedPath = await extractTar(downloadPath, undefined, [
    "xz",
    "--strip-components",
    "1",
  ]);
  core.debug("Caching sccache");
  const toolPath = await cacheDir(
    extractedPath,
    TOOL_NAME,
    VERSION,
    process.platform
  );
  await setCache(toolPath);
}

async function run(): Promise<void> {
  try {
    await guardedRun();
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

run();
