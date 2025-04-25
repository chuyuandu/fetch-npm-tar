import { parse } from "yaml";
import { join, dirname } from "path";
import { readFileSync, createWriteStream, unlink, rename } from "fs";
import { execSync } from "child_process";
import { get } from "https";
import pLimit from "p-limit";
import { tgzFolderName } from "./util.mjs";

const limit = pLimit(12);
const outputFilePath = join(process.cwd(), tgzFolderName);

/**
 * 下载 pnpm-lock.yaml 文件中所有的依赖 npm 包
 * @param {string} filePath pnpm-lock.yaml 文件路径
 */
export function downloadFilesFromYaml(filePath, includeDeps = true) {
  const pkgList = getPackagesFromYaml(filePath, includeDeps);

  let total = pkgList.length,
    okNum = 0,
    errorNum = 0;
  console.log(`开始下载，共 ${total} 个包...`);
  const registry = getRegistry(dirname(filePath));
  const downloadList = pkgList.map((pkg) => {
    return limit(() =>
      downloadFile(registry, pkg.name, pkg.version)
        .then(() => {
          okNum++;
        })
        .catch(() => {
          console.error(`下载错误: ${pkg.name}@${pkg.version}`);
          errorNum++;
        })
        .finally(() => {
          console.log(
            `已下载:${okNum},失败：${errorNum}, 剩余 ${
              total - okNum - errorNum
            }`
          );
        })
    );
  });
  return Promise.all(downloadList);
}

/** 通过pnpm-lock.yaml 文件获取所有依赖包列表 */
function getPackagesFromYaml(filePath, includeDeps) {
  const fileContent = readFileSync(filePath, "utf8");
  const data = parse(fileContent);

  const pkgList = [];
  if (includeDeps) {
    for (let pkg in data.packages) {
      let name, version;
      if (pkg.startsWith("@")) {
        const index = pkg.lastIndexOf("@");
        name = pkg.slice(0, index);
        version = pkg.slice(index + 1);
      } else {
        [name, version] = pkg.split("@");
      }
      pkgList.push({
        name,
        version,
      });
    }
  } else {
    const deps = data.importers["."]["dependencies"];
    for (let pkg in deps) {
      pkgList.push({
        name: pkg,
        version: deps[pkg].version,
      });
    }
  }
  return pkgList;
}

function createWriteStreamWithRetry(filePath, retries = 5, delay = 100) {
  return new Promise((resolve, reject) => {
    const attempt = (attemptCount) => {
      const stream = createWriteStream(filePath);
      stream.on("error", (err) => {
        if (err.code === "EPERM" && attemptCount < retries) {
          console.warn(
            `尝试 ${attemptCount + 1}/${retries} 写入文件失败，重试中...`
          );
          setTimeout(() => attempt(attemptCount + 1), delay);
        } else {
          console.error(`尝试写入文件 ${filePath} 失败`);
          reject(err);
        }
      });
      stream.on("open", () => resolve(stream));
    };
    attempt(0);
  });
}

/** 从url下载文件，并保存为指定路径下的文件 */
function downloadUrl(fileUrl, filePath, maxRedirects = 5) {
  // const fileStream = createWriteStream(outputPath);
  const outputPath = `${filePath}_temp`;
  return createWriteStreamWithRetry(outputPath).then((fileStream) => {
    return new Promise(function (resolve, reject) {
      if (maxRedirects <= 0) {
        console.error("Too many redirects.");
        reject(); // 防止无限重定向
      }
      get(fileUrl, (response) => {
        if (response.statusCode !== 200) {
          //   console.error(
          //     `Failed to download file: ${packageName}@${packageVersion}. Status code: ${response.statusCode}`
          //   );

          fileStream.close();
          response.destroy();
          unlink(outputPath, () => {
            // 如果状态码是 301 或 302，处理重定向
            if (response.statusCode === 301 || response.statusCode === 302) {
              const redirectLocation = response.headers.location;
              if (!redirectLocation) {
                console.error("Redirect location is missing.");
                //   process.exit(1);
                reject();
              }
              resolve(
                downloadUrl(redirectLocation, filePath, maxRedirects - 1)
              ); // 递归处理重定向
            } else {
              reject();
            }
          });

          return;
        }

        response.pipe(fileStream);

        fileStream.on("finish", () => {
          fileStream.close(() => {
            rename(outputPath, filePath, () => {
              resolve();
            });
          });
        });

        fileStream.on("error", (err) => {
          console.error("Error writing file:", err.message, fileUrl);
          fileStream.close();
          unlink(outputPath, () => {});
          reject();
        });
      }).on("error", (err) => {
        console.error("Error downloading file:", err.message, fileUrl);
        fileStream.close();
        unlink(outputPath, () => {});
        reject();
      });
    });
  });
}
/** 从npm仓库下载包 */
function downloadFile(registry, packageName, packageVersion) {
  // 构造 tarball URL
  let fileUrl, fileName;
  if (packageName.startsWith("@")) {
    const [org, pkg] = packageName.split("/");
    fileUrl = `${registry}/${packageName}/-/${pkg}-${packageVersion}.tgz`;
    fileName = `${org}~${pkg}+${packageVersion}.tgz`;
  } else {
    fileUrl = `${registry}/${packageName}/-/${packageName}-${packageVersion}.tgz`;
    fileName = `${packageName}+${packageVersion}.tgz`;
  }

  // 下载并保存为指定文件名
  const outputPath = join(outputFilePath, fileName);

  return downloadUrl(fileUrl, outputPath);
}

/** 从指定目录获取 npm config 设置的 registry */
function getRegistry(dir) {
  const output = execSync("npm config get registry", {
    cwd: dir,
    encoding: "utf-8",
  });
  return output.trim();
}
