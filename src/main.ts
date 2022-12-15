import * as core from "@actions/core";
import { exec } from "@actions/exec";
import { HttpClient, HttpCodes } from "@actions/http-client";
import { cacheDir, downloadTool, extractTar, find } from "@actions/tool-cache";
import { Endpoints } from "@octokit/types";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import * as path from "path";

// Todo: make this input
const VERSION = "0.3.3";
const TOOL_NAME = "sccache";
const SCCACHE_LATEST_RELEASE =
  "https://api.github.com/repos/mozilla/sccache/releases/latest";
const GITHUB_API_ACCEPT_HEADER = "application/vnd.github+json";
const USER_AGENT = "metalbear-co/sccache-action";

function getRustPlatform(): string {
  switch (process.platform) {
    case "darwin":
      return "apple-darwin";
    case "linux":
      return "unknown-linux-musl";
    case "win32":
      return "pc-windows-msvc";
    default:
      return "";
  }
}

async function getLatestRelease(): Promise<string> {
  const http = new HttpClient(USER_AGENT);
  const res = await http.get(SCCACHE_LATEST_RELEASE, {
    Accept: GITHUB_API_ACCEPT_HEADER,
  });
  if (res.message.statusCode !== HttpCodes.OK) {
    throw new Error(
      `Error getting latest release: ${res.message.statusCode} ${res.message.statusMessage}`
    );
  }

  const {
    tag_name,
    assets,
  }: Endpoints["GET /repos/{owner}/{repo}/releases/latest"]["response"]["data"] =
    JSON.parse(await res.readBody());
  if (assets.length === 0) {
    throw new Error(
      `Cannot find any prebuilt binaries for version ${tag_name}`
    );
  }

  return tag_name;
}

async function getDownloadUrl(): Promise<string> {
  const arch = process.arch === "x64" ? "x86_64" : "aarch64";
  const platform = getRustPlatform();
  if (!platform || (platform === "pc-windows-msvc" && arch === "aarch64")) {
    // sccache does not provide prebuilt binaries for arm64 Windows
    throw new Error(`Unsupported platform: ${process.platform}`);
  }
  const version = await getLatestRelease();
  const assetName = `sccache-${version}-${arch}-${platform}.tar.gz`;
  return `https://github.com/mozilla/sccache/releases/download/${version}/${assetName}`;
}

async function getExpectedSha256Hash(downloadUrl: string): Promise<string> {
  const sha256Url = `${downloadUrl}.sha256`;
  const http = new HttpClient(USER_AGENT);
  const res = await http.get(sha256Url);
  if (res.message.statusCode !== HttpCodes.OK) {
    throw new Error(
      `Error getting release SHA-256: ${res.message.statusCode} ${res.message.statusMessage}`
    );
  }
  return res.readBody();
}

async function download(): Promise<string> {
  const downloadUrl = await getDownloadUrl();
  const expectedHash = await getExpectedSha256Hash(downloadUrl);
  const downloadPath = await downloadTool(downloadUrl);
  const file = await fs.readFile(downloadPath);
  const actualHash = createHash("sha256").update(file).digest("hex");
  if (actualHash !== expectedHash) {
    `SHA-256 hash did not match, expected ${expectedHash}, got ${actualHash}`;
  }
  return downloadPath;
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
  const downloadPath = await download();
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
