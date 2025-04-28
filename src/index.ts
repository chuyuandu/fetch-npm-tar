#!/usr/bin/env node
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  rmSync,
  readdirSync,
  statSync,
  unlinkSync,
  rmdirSync,
} from "node:fs";
import { resolve as _resolve, join } from "node:path";
import { downloadFilesFromYaml } from "./download";
import { createInterface } from "node:readline";
import { tgzFolderName, getCurrentVersion, getLatestVersion, helpContent } from "./util";
import arg from "arg";

let toBeRemoved: string[] = [];
const cwd = process.cwd();
const tgzFiles = _resolve(cwd, tgzFolderName);

const args = arg({
  "--help": Boolean,
  "--version": Boolean,
  "--lockfile": String,
  // 是否仅下载指定包名，不解析递归依赖
  "--no-deps": Boolean,

  // alias
  "-h": "--help",
  "-v": "--version",
  "-f": "--lockfile",
});

async function initDir(): Promise<void> {
  return await new Promise(function (resolve, reject) {
    if (existsSync(tgzFiles)) {
      console.error(`${tgzFiles} 已经存在，请考虑删除或换个目录执行`);

      // 创建 readline 接口
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      // 提示用户输入
      rl.question(
        `${tgzFiles} 已经存在，请输入 1:叠加下载   2:清空目录   3:退出\n`,
        (val) => {
          if (val === "1") {
            // 叠加下载前，需要清除可能存在的 lock 和 json 文件
            rmSync(_resolve(tgzFiles, "pnpm-lock.yaml"), {
              force: true,
            });
            rmSync(_resolve(tgzFiles, "package.json"), {
              force: true,
            });
            resolve();
          } else if (val === "2") {
            emptyDirectory(tgzFiles);
            resolve();
          } else if (val === "3") {
            process.exit();
          } else {
            process.exit();
          }

          // 关闭接口
          rl.close();
        }
      );
    } else {
      mkdirSync(tgzFiles);
    }
  });
}

function emptyDirectory(dirPath: string) {
  if (!existsSync(dirPath)) {
    console.error(`目录不存在: ${dirPath}`);
    return;
  }

  // 读取目录内容
  const files = readdirSync(dirPath);

  for (const file of files) {
    const filePath = join(dirPath, file);
    const stats = statSync(filePath);

    if (stats.isDirectory()) {
      // 如果是子目录，递归清空并删除目录
      emptyDirectory(filePath);
      rmdirSync(filePath); // 删除空目录
    } else {
      // 如果是文件，直接删除
      unlinkSync(filePath);
    }
  }

  console.log(`目录已清空: ${dirPath}`);
}

async function getLockFile(): Promise<string> {
  const lockfile = args["--lockfile"];
  let filePath;
  if (lockfile) {
    await initDir();
    // const [name, file_path] = lockfile.split("=");
    filePath = _resolve(cwd, lockfile);
    console.log(`正在使用依赖文件：${filePath}`);
  } else if (args["_"]) {
    await initDir();
    // // 检查是否通过 npx 调用
    // const isNpx = process.env.npm_execpath && process.env.npm_execpath.includes('npx');

    execSync(
      `npm init -y && npx pnpm add ${args["_"].join(" ")} --lockfile-only`,
      {
        cwd: tgzFiles,
      }
    );
    filePath = _resolve(tgzFiles, "pnpm-lock.yaml");
    toBeRemoved.push(
      _resolve(tgzFiles, "pnpm-lock.yaml"),
      _resolve(tgzFiles, "package.json")
    );
  } else {
    console.error(`请指定需要下载的包`);
    process.exit();
  }
  return filePath;
}

function handleArgs() {
  const latestVersion = getLatestVersion();
  const currentVersion = getCurrentVersion();
  if(latestVersion !== currentVersion) {
    console.warn(`当前版本已更新到 ${latestVersion}，建议先更新版本！`)
  }

  if (args["--version"]) {
    console.log(currentVersion);
  } else if (args["--help"]) {
    console.log(helpContent);
  } else {
    getLockFile().then((file) => {
      downloadFilesFromYaml(file, !args['--no-deps']).finally(() => {
        console.log(`已成功下载到：${tgzFiles}`);
        toBeRemoved.forEach((file) => {
          rmSync(file, {
            force: true,
          });
        });
      });
    });
  }
}

handleArgs();
