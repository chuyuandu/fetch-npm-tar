import { execSync } from "node:child_process";
import pkg from '../package.json'

/** 下载文件的保存目录名 */
export const tgzFolderName = "_downloaded_tgz_files_";

/** 帮助文档 */
export const helpContent = `
通过命令行直接下载指定包及所有递归依赖到当前目录下的 ${tgzFolderName} 目录下
可以直接指定包名，包名写法跟pnpm add 时的参数格式类型，但是目前仅支持 npm 官方的包,以下是一些写法示例, 支持同时多个，空格隔开：

  fetch-npm-tar axios
  fetch-npm-tar axios@^1.7.7
  fetch-npm-tar vue axios@^1.7.7

默认会解析所有递归的依赖，如果不需要下载其递归的依赖可以添加参数 --no-deps

fetch-npm-tar vue --no-deps

也可以下载某个 pnpm-lock.yaml 文件所有的依赖

  fetch-npm-tar --lockfile="<path_to_pnpm-lock.yaml>"

指定文件下载时，如果设定了 --no-deps 参数，那么只会下载 importers[''']['dependencies] 下的依赖
对应的是 package.json 的 dependencies

如果是需要下载某个项目的所有依赖，可以现在项目下生成 pnpm-lock.yaml 文件，然后再指定该文件进行下载
`;

/** 获取当前运行的版本号 */
export function getCurrentVersion(): string {
  // const pkg = readFileSync(resolve(import.meta.dirname, "./package.json"));
  // return JSON.parse(pkg).version;
  return pkg.version;
}

/** 获取当前包的最新版本号 */
export function getLatestVersion(): string {
  let version = "";
  try {
    version = execSync("npm view fetch-npm-tar version").toString().trim();
  } catch (err: any) {
    console.error("获取 npm 最新版本失败:", err.message);
  }
  return version;
}
