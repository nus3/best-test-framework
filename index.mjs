// jest-haste-mapを使うことでいい感じにキャッシュしてくれるし、globっぽくファイルの取得もできる
import JestHasteMap from "jest-haste-map";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { cpus } from "node:os";
import { Worker } from "jest-worker";
import chalk from "chalk";

const root = dirname(fileURLToPath(import.meta.url));
const hasteMapOptions = {
  extensions: ["js"],
  maxWorkers: cpus().length,
  name: "best-test-framework",
  platforms: [],
  rootDir: root,
  roots: [root],
};
const hasteMap = new JestHasteMap.default(hasteMapOptions);
await hasteMap.setupCachePath(hasteMapOptions);
const { hasteFS } = await hasteMap.build();

const testFiles = hasteFS.matchFilesWithGlob([
  process.argv[2] ? `**/${process.argv[2]}` : "**/*.test.js",
]);

const worker = new Worker(join(root, "worker.js"), {
  enableWorkerThreads: true,
});

let hasFailed = false;

// jest-workerを使うことで並列で処理できる。別プロセスで実行される？
for (const testFile of testFiles) {
  const { success, testResults, errorMessage } = await worker.runTest(testFile);

  const status = success
    ? chalk.green.inverse(" PASS ")
    : chalk.red.inverse(" FAIL ");
  console.log(status + " " + chalk.dim(relative(root, testFile)));
  if (!success) {
    hasFailed = true;

    if (testResults) {
      testResults
        .filter((result) => result.errors.length)
        .forEach((result) =>
          console.log(
            // Skip the first part of the path which is an internal token.
            result.testPath.slice(1).join(" ") + "\n" + result.errors[0]
          )
        );
    } else if (errorMessage) {
      console.log(" " + errorMessage);
    }
  }
}

worker.end();

if (hasFailed) {
  console.log(
    "\n" + chalk.red.bold("Test run failed, please fix all the failing tests.")
  );
  process.exitCode = 1;
}
