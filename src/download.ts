import { parse } from 'yaml';
// import { cpus } from "node:os";
import { join, dirname } from 'node:path';
import {
  createWriteStream,
  unlink,
  rename,
  type WriteStream,
  existsSync,
} from 'node:fs';
import { execSync } from 'node:child_process';
import { get } from 'node:https';
import pLimit from 'p-limit';
import { Output } from './output';
import chalk from 'chalk';
import { readFile } from 'node:fs/promises';

export class Download {
  private output: Output;

  constructor(
    private opts: {
      tgzFolder: string;
      includeDeps: boolean;
      limit?: number;
    },
  ) {
    this.opts = opts;
    this.output = new Output(opts.tgzFolder);
  }
  /**
   * 下载 pnpm-lock.yaml 文件中所有的依赖 npm 包
   * @param {string} filePath pnpm-lock.yaml 文件路径
   */
  async downloadFilesFromYaml(filePath: string) {
    const _self = this;
    const pkgList = await _self.getPackagesFromYaml(
      filePath,
      _self.opts.includeDeps,
    );

    const total = pkgList.length;
    // const limit = pLimit(cpus().length);
    const limit = pLimit(Math.max(8, _self.opts.limit || 1));

    _self.output.start(total);
    const registry = _self.getRegistry(dirname(filePath));
    const downloadList = pkgList.map(pkg => {
      return limit(() =>
        _self
          .downloadFile(registry, pkg.name, pkg.version)
          .then(() => {
            _self.output.succeedItem();
          })
          .catch(error => {
            _self.output.failedItem(
              `download failed: ${chalk.bgRed(
                `${pkg.name}@${pkg.version}`,
              )} , ${chalk.red(
                typeof error === 'string' ? error : error.message,
              )}`,
            );
          }),
      );
    });
    return Promise.all(downloadList).finally(() => {
      _self.output.finish();
    });
  }

  /** 通过pnpm-lock.yaml 文件获取所有依赖包列表 */
  async getPackagesFromYaml(filePath: string, includeDeps: boolean) {
    const fileContent = await readFile(filePath, 'utf8');
    const data = parse(fileContent);

    const pkgList = [];
    if (includeDeps) {
      for (const pkg in data.packages) {
        let name, version;
        if (pkg.startsWith('@')) {
          const index = pkg.lastIndexOf('@');
          name = pkg.slice(0, index);
          version = pkg.slice(index + 1);
        } else {
          [name, version] = pkg.split('@');
        }
        pkgList.push({
          name,
          version,
        });
      }
    } else {
      const deps = data.importers['.']['dependencies'];
      for (const pkg in deps) {
        pkgList.push({
          name: pkg,
          version: deps[pkg].version,
        });
      }
    }
    return pkgList;
  }

  private createWriteStreamWithRetry(
    filePath: string,
    retries = 5,
    delay = 100,
  ): Promise<WriteStream> {
    const _self = this;
    return new Promise((resolve, reject) => {
      const attempt = (attemptCount: number) => {
        const stream = createWriteStream(filePath);
        stream.on('error', (err: Error & { code?: string }) => {
          if (err.code === 'EPERM' && attemptCount < retries) {
            _self.output.failedItem(
              chalk.yellow(
                `尝试写入文件失败，重试中...  ${attemptCount + 1}/${retries} `,
              ),
              false,
            );
            setTimeout(() => attempt(attemptCount + 1), delay);
          } else {
            // _self.output.failedItem(`尝试写入文件 ${filePath} 失败`);
            reject(`尝试写入文件 ${filePath} 失败, ${err}`);
          }
        });
        stream.on('open', () => resolve(stream));
      };
      attempt(0);
    });
  }

  /** 从url下载文件，并保存为指定路径下的文件 */
  downloadUrl(
    fileUrl: string,
    filePath: string,
    maxRedirects = 5,
  ): Promise<void> {
    if (existsSync(filePath)) {
      // 叠加下载时，存在的文件直接跳过
      return Promise.resolve();
    }
    const outputPath = `${filePath}_temp`;
    const _self = this;
    return _self.createWriteStreamWithRetry(outputPath).then(fileStream => {
      return new Promise(function (resolve, reject) {
        if (maxRedirects <= 0) {
          fileStream.close();
          unlink(outputPath, () => {});
          reject(`重定向次数过多`); // 防止无限重定向
        }
        get(fileUrl, response => {
          if (response.statusCode !== 200) {
            fileStream.close();
            response.destroy();
            unlink(outputPath, () => {
              // 如果状态码是 301 或 302，处理重定向
              if (response.statusCode === 301 || response.statusCode === 302) {
                const redirectLocation = response.headers.location;
                if (!redirectLocation) {
                  reject(`重定向地址缺失`);
                } else {
                  resolve(
                    _self.downloadUrl(
                      redirectLocation,
                      filePath,
                      maxRedirects - 1,
                    ),
                  ); // 递归处理重定向
                }
              } else {
                reject(response.statusMessage);
              }
            });

            return;
          }

          response.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close(() => {
              rename(outputPath, filePath, () => {
                resolve();
              });
            });
          });

          fileStream.on('error', (err: Error) => {
            fileStream.close();
            unlink(outputPath, () => {});
            reject(err.message);
          });
        }).on('error', err => {
          fileStream.close();
          unlink(outputPath, () => {});
          reject(err.message);
        });
      });
    });
  }
  /** 从npm仓库下载包 */
  downloadFile(registry: string, packageName: string, packageVersion: string) {
    // 构造 tarball URL
    let fileUrl, fileName;
    if (packageName.startsWith('@')) {
      const [org, pkg] = packageName.split('/');
      fileUrl = `${registry}/${packageName}/-/${pkg}-${packageVersion}.tgz`;
      fileName = `${org}~${pkg}+${packageVersion}.tgz`;
    } else {
      fileUrl = `${registry}/${packageName}/-/${packageName}-${packageVersion}.tgz`;
      fileName = `${packageName}+${packageVersion}.tgz`;
    }

    // 下载并保存为指定文件名
    const outputPath = join(this.opts.tgzFolder, fileName);

    return this.downloadUrl(fileUrl, outputPath);
  }

  /** 从指定目录获取 npm config 设置的 registry */
  getRegistry(dir: string) {
    const stdout = execSync('npm config get registry', {
      cwd: dir,
      encoding: 'utf-8',
    });
    return stdout.trim();
  }
}
