import * as core from "@actions/core";
import * as path from "path";
const exec = require("@actions/exec");
const tc = require("@actions/tool-cache");

async function guardedRun(): Promise<void> {
  core.debug("Gathering statistics");
  exec.exec("sccache", ["--show-stats"]);
}

async function run(): Promise<void> {
  try {
    await guardedRun();
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

run();
