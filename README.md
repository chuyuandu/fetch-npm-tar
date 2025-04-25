# fetch-npm-tar

通过命令行直接下载指定包及所有递归依赖到当前目录下的 `_downloaded_tgz_files_` 目录下

## 使用

可以全局安装 `npm i fetch-npm-tar -g`, 然后使用 `fetch-npm-tar xxxx`

也可以临时使用  `npx fetch-npm-tar xxxx`

可以直接指定包名，包名写法跟 pnpm add 时的参数格式类型，但是目前仅支持 npm 官方的包,以下是一些写法示例, 支持同时多个，空格隔开：

```sh


# 仅指定包名下载
fetch-npm-tar axios
# 指定包名和版本
fetch-npm-tar axios@^1.7.7
# 同时下载多个包
fetch-npm-tar vue axios@^1.7.7

# 仅下载指定包，不解析依赖
fetch-npm-tar vite --no-deps

# 也可以下载某个 `pnpm-lock.yaml`文件所有个依赖
fetch-npm-tar --lockfile="<relative_path_to_pnpm-lock.yaml>"

# 如果是需要下载某个项目的所有依赖, 有pnpm-lock.yaml文件时就可以直接指定
# 如果没有，但是有 package-lock.json、 npm-shrinkwrap.json 或 yarn.lock 文件
# 可以通过 pnpm import 命令生成
# 都没有的话，可以直接通过 pnpm i 生成
# 然后就可以通过上面的命令下载项目的所有依赖了
```

# 参数

| 参数               | 说明                                                                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| --version<br />-v  | 查看当前版本号                                                                                                                                            |
| --help<br />-h     | 查看帮助信息                                                                                                                                              |
| --lockfile<br />-f | 指定lockfile文件路径<br />  `--lockfile="path_to_yaml"` <br /> `--lockfile "path_to_yaml"` <br /> `-f "path_to_yaml"`  <br /> `-f="path_to_yaml"` |
| 其它参数           | 要下载的包名及可选的版本，仅在未指定 lockfile 时生效<br />  `fetch-npm-tar xxx@xxx` <br /> `fetch-npm-tar xxx@xxx xx2@latest`                         |
