import * as core from "@actions/core";
import tc from "@actions/tool-cache";
import * as path from "path";

// Todo: make this input
const VERSION = "0.3.1";
const TOOL_NAME = "sccache";

function getDownloadPath(): string {
  switch (process.platform) {
    case "darwin":
      return `https://github.com/mozilla/sccache/releases/download/v${VERSION}/sccache-v${VERSION}-x86_64-apple-darwin.tar.gz`;
    case "linux":
      return `https://github.com/mozilla/sccache/releases/download/v${VERSION}/sccache-v${VERSION}-x86_64-unknown-linux-musl.tar.gz`;
    case "win32":
      return `https://github.com/mozilla/sccache/releases/download/v${VERSION}/sccache-v${VERSION}-x86_64-pc-windows-msvc.tar.gz`;
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

function setCache(sccacheDirectory: string): void {
  core.debug("Configuring use of sccache from from path: " + sccacheDirectory);
  let binaryPath = path.join(sccacheDirectory, "sccache");
  if (process.platform == "win32") {
    binaryPath += ".exe";
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
  core.exportVariable("SCCACHE_GHA_CACHE_TO", "sccache");
  core.exportVariable("SCCACHE_GHA_CACHE_TO", "sccache");
  core.addPath(sccacheDirectory);
  core.debug("Configured sccache!");
}

async function guardedRun(): Promise<void> {
  core.debug("Trying to find cached sccache ;)");
  const sccacheDirectory = tc.find(TOOL_NAME, VERSION, process.platform);
  if (sccacheDirectory) {
    core.debug("Found cached sccache");
    return setCache(sccacheDirectory);
  }
  core.debug("Downloading sccache");
  const downloadPath = await tc.downloadTool(getDownloadPath());
  core.debug("Extracting sccache");
  const extractedPath = await tc.extractTar(downloadPath);
  core.debug("Caching sccache");
  await tc.cacheDir(extractedPath, TOOL_NAME, VERSION);
  setCache(sccacheDirectory);
}

async function run(): Promise<void> {
  try {
    await guardedRun();
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

run();
