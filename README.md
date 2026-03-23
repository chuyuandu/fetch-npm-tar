# fetch-npm-tar

通过命令行直接下载指定包及所有递归依赖到当前目录下的 `_downloaded_tgz_files_` 目录下

也支持通过指定 pnpm-lock.yaml 文件下载项目里面的所有依赖包

## 使用

可以全局安装 `npm i fetch-npm-tar -g`, 然后使用 `fetch-npm-tar xxxx`

也可以临时使用 `npx fetch-npm-tar xxxx`

可以直接指定包名，包名写法参考 npm install 时的格式，但是目前仅支持下载 npm 服务器上的包,以下是一些写法示例, 支持同时多个，空格隔开：

### 同时下载多个包

```sh
fetch-npm-tar vue axios@^1.7.7
```

### 仅下载指定包，不解析依赖

```sh
fetch-npm-tar vite --no-deps
```

### 下载项目中所有依赖，可以参考以下方法之一：

1. 下载 `pnpm-lock.yaml`文件所有个依赖

```sh
fetch-npm-tar --lockfile="<path_to_pnpm-lock.yaml>"
```

2. 没有 `pnpm-lock.yaml` 文件时，但是有 package-lock.json、 npm-shrinkwrap.json 或 yarn.lock 文件,通过指向 pnpm import 可以生成对应的 `pnpm-lock.yaml` 文件

3. 前面条件都不满足，那就直接将项目初始化后通过 `pnpm i --lockfile-only` 生成 `pnpm-lock.yaml` 文件

# 参数说明

| 参数               | 说明                                                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| --version<br />-v  | 查看当前版本号                                                                                                                                  |
| --help<br />-h     | 查看帮助信息                                                                                                                                    |
| --lockfile<br />-f | 指定lockfile文件路径<br /> `--lockfile="path_to_yaml"` <br /> `--lockfile "path_to_yaml"` <br /> `-f "path_to_yaml"` <br /> `-f="path_to_yaml"` |
| --no-deps          | 指定包名时，只解析当前包，不解析依赖<br />指定文件时，则只解析 importers[''']['dependencies] 下的依赖，即 package.json 的 dependencies          |
| --limit<br />-l    | 指定并发下载数，默认为 cpu 核数的两倍                                                                                                           |
| 其它参数           | 要下载的包名及可选的版本，仅在未指定 lockfile 时生效<br /> `fetch-npm-tar xxx@xxx` <br /> `fetch-npm-tar xxx@xxx xx2@latest`                    |

```

```
