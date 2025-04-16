#!/usr/bin/env node

const { execSync } = require("child_process");
const {
  existsSync,
  mkdirSync,
  rmSync,
  readdirSync,
  statSync,
  unlinkSync,
  rmdirSync,
} = require("fs");
const path = require("path");
const { downloadFilesFromYaml } = require("./download");
const readline = require("readline");
const { tgzFolderName } = require("./util");

let toBeRemoved = [];
const cwd = process.cwd();
const tgzFiles = path.resolve(cwd, tgzFolderName);

const args = process.argv.slice(2);

async function initDir() {
  return await new Promise(function (resolve, reject) {
    if (existsSync(tgzFiles)) {
      console.error(`${tgzFiles} 已经存在，请考虑删除或换个目录执行`);

      // 创建 readline 接口
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      // 提示用户输入
      rl.question(
        `${tgzFiles} 已经存在，请输入 1:叠加下载   2:清空目录   3:退出\n`,
        (val) => {
          if (val === "1") {
            // 叠加下载前，需要清除可能存在的 lock 和 json 文件
            rmSync(path.resolve(tgzFiles, "pnpm-lock.yaml"), {
              force: true,
            });
            rmSync(path.resolve(tgzFiles, "package.json"), {
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

function emptyDirectory(dirPath) {
  if (!existsSync(dirPath)) {
    console.error(`目录不存在: ${dirPath}`);
    return;
  }

  // 读取目录内容
  const files = readdirSync(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
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

async function getLockFile() {
  const lockfile = args.find((arg) => arg.startsWith("--lockfile"));
  let filePath;
  if (lockfile) {
    await initDir();
    const [name, file_path] = lockfile.split("=");
    console.log(file_path);
    filePath = path.resolve(cwd, file_path.replace(/^["']|["']$/, ""));
  } else if (args.length) {
    await initDir();
    // // 检查是否通过 npx 调用
    // const isNpx = process.env.npm_execpath && process.env.npm_execpath.includes('npx');

    execSync(`npm init -y && npx pnpm add ${args.join(" ")} --lockfile-only`, {
      cwd: tgzFiles,
    });
    filePath = path.resolve(tgzFiles, "pnpm-lock.yaml");
    toBeRemoved.push(
      path.resolve(tgzFiles, "pnpm-lock.yaml"),
      path.resolve(tgzFiles, "package.json")
    );
  } else {
    console.error(`请指定需要下载的包`);
    process.exit();
  }
  return filePath;
}

if(args.includes('-h')) {
    console.log(`
通过命令行直接下载指定包及所有递归依赖到当前目录下的 ${tgzFolderName} 目录下
可以直接指定包名，包名写法跟pnpm add 时的参数格式类型，但是目前仅支持 npm 官方的包,以下是一些写法示例, 支持同时多个，空格隔开：

  fetch-npm-tar axios
  fetch-npm-tar axios@^1.7.7
  fetch-npm-tar vue axios@^1.7.7

也可以下载某个 pnpm-lock.yaml 文件所有的依赖

  fetch-npm-tar --lockfile="<path_to_pnpm-lock.yaml>"

如果是需要下载某个项目的所有依赖，可以现在项目下生成 pnpm-lock.yaml 文件，然后再指定该文件进行下载
`)
}
else {

    getLockFile().then((file) => {
        downloadFilesFromYaml(file).finally(() => {
          console.log(`已成功下载到：${tgzFiles}`);
          toBeRemoved.forEach((file) => {
            rmSync(file, {
              force: true,
            });
          });
        });
      });
}

