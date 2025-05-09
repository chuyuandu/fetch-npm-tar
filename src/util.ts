import { execSync } from 'node:child_process';
import pkg from '../package.json';
import { Result } from 'arg';
import chalk from 'chalk';

/** 参数声明 */
export const arg_declare = {
  '--help': Boolean,
  '--version': Boolean,
  '--lockfile': String,
  // 是否仅下载指定包名，不解析递归依赖
  '--no-deps': Boolean,
  // 最大并发下载数, 最小为 1， 默认为 8
  '--limit': Number,

  // alias
  '-h': '--help',
  '-v': '--version',
  '-f': '--lockfile',
  '-l': '--limit',
};
/** args 参数解析结果类型 */
// export type IArgType = Result<typeof arg_declare>;
export type IArgType = Result<typeof arg_declare> & {
  cwd: string;
  tgzFolder: string;
};

/** 下载文件的保存目录名 */
export const tgzFolderName = '_downloaded_tgz_files_';

const params = [
  {
    name: '--version',
    alias: '-v',
    des: '查看当前版本号',
  },
  {
    name: '--help',
    alias: '-h',
    des: '查看帮助信息',
  },
  {
    name: '--lockfile',
    alias: '-f',
    des: `指定 ${chalk.yellow('pnpm-lock.yaml')} 文件路径,适用于下载某个项目的所有依赖
    如果没有该文件，但是有 package-lock.json、 npm-shrinkwrap.json 或 yarn.lock 文件
    则可以通过 pnpm import 命令生成
    都没有的话，可以直接通过 pnpm i 生成`,
  },
  {
    name: ['--no-deps'],
    des: `只解析当前包，不解析递归依赖
    指定文件时，则只解析 importers[''']['dependencies] 下的依赖，即 package.json 的 ${chalk.yellow('dependencies')} 声明的依赖`,
  },
  {
    name: '--limit',
    alias: '-l',
    des: '查看当前版本号',
  },
  {
    name: ['其它参数'],
    des: `要下载的包名及可选的版本，支持多个，以空格隔开，包名写法参考 ${chalk.yellow('npm install')} 时的语法，仅在未指定 lockfile 时生效`,
  },
];

/** 帮助文档 */
export const helpContent = `
${chalk.greenBright(`通过命令行直接下载指定包及所有递归依赖或某个项目所有依赖包到当前目录下的 ${chalk.blueBright(tgzFolderName)} 目录下`)}

${params
  .map(item => {
    return `  ${chalk.blueBright(item.name)}: ${item.alias ? ` ${chalk.blue(item.alias)}` : ''}

    ${item.des}`;
  })
  .join(`\n\n`)}
`;

/** 获取当前运行的版本号 */
export function getCurrentVersion(): string {
  // const pkg = readFileSync(resolve(import.meta.dirname, "./package.json"));
  // return JSON.parse(pkg).version;
  return pkg.version;
}

/** 获取当前包的最新版本号 */
export function getLatestVersion(): string {
  let version = '';
  try {
    version = execSync('npm view fetch-npm-tar version').toString().trim();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error('获取 npm 最新版本失败:', err.message || '');
  }
  return version;
}
