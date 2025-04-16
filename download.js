const yml = require("yaml");
const path = require("path");
const fs = require("fs");
const child_process = require("child_process");
const https = require("https");
const {tgzFolderName} = require('./util')

const outputFilePath = path.join(process.cwd(), tgzFolderName);
/**
 * 下载 pnpm-lock.yaml 文件中所有的依赖 npm 包
 * @param {string} filePath pnpm-lock.yaml 文件路径
 */
exports.downloadFilesFromYaml = function (filePath) {
  const pkgList = getPackagesFromYaml(filePath);

  let total = pkgList.length,
    okNum = 0,
    errorNum = 0;
  console.log(`开始下载，共 ${total} 个包...`);
  const registry = getRegistry(path.dirname(filePath));
  const downloadList = pkgList.map((pkg) => {
    return downloadFile(registry, pkg.name, pkg.version)
      .then(() => {
        okNum++;
      })
      .catch(() => {
        console.error(`下载错误: ${pkg.name}@${pkg.version}`);
        errorNum++;
      })
      .finally(() => {
        console.log(
          `已下载:${okNum},失败：${errorNum}, 剩余 ${total - okNum - errorNum}`
        );
      });
  });
  return Promise.all(downloadList);
};

/** 通过pnpm-lock.yaml 文件获取所有依赖包列表 */
function getPackagesFromYaml(filePath) {
  const fileContent = fs.readFileSync(filePath, "utf8");
  const data = yml.parse(fileContent);
  const pkgList = [];
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
  return pkgList;
}

/** 从url下载文件，并保存为指定路径下的文件 */
function downloadUrl(fileUrl, outputPath, maxRedirects = 5) {
  const fileStream = fs.createWriteStream(outputPath);
  return new Promise(function (resolve, reject) {
    if (maxRedirects <= 0) {
      console.error("Too many redirects.");
      reject(); // 防止无限重定向
    }
    https
      .get(fileUrl, (response) => {
        if (response.statusCode !== 200) {
          //   console.error(
          //     `Failed to download file: ${packageName}@${packageVersion}. Status code: ${response.statusCode}`
          //   );

          fileStream.close();
          response.destroy();
          fs.unlink(outputPath, () => {
            // 如果状态码是 301 或 302，处理重定向
            if (response.statusCode === 301 || response.statusCode === 302) {
              const redirectLocation = response.headers.location;
              if (!redirectLocation) {
                console.error("Redirect location is missing.");
                //   process.exit(1);
                reject();
              }
              resolve(
                downloadUrl(redirectLocation, outputPath, maxRedirects - 1)
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
            //   console.log(
            //     `File downloaded successfully and saved as ${outputPath}`
            //   );
          });
          resolve();
        });

        fileStream.on("error", (err) => {
          console.error("Error writing file:", err.message);
          fs.unlink(outputPath, () => {});
          reject();
        });
      })
      .on("error", (err) => {
        console.error("Error downloading file:", err.message);
        fs.unlink(outputPath, () => {});
        reject();
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
  const outputPath = path.join(outputFilePath, fileName);

  return downloadUrl(fileUrl, outputPath);
}

/** 从指定目录获取 npm config 设置的 registry */
function getRegistry(dir) {
  const output = child_process.execSync("npm config get registry", {
    cwd: dir,
    encoding: "utf-8",
  });
  return output.trim();
}
