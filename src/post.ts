import * as core from "@actions/core";
import { exec } from "@actions/exec";

async function guardedRun(): Promise<void> {
  core.debug("Stopping server and gathering statistics");
  exec("sccache", ["--stop-server"]);
}

async function run(): Promise<void> {
  try {
    await guardedRun();
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

run();
