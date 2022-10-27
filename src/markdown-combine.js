const fs = require("fs");
const util = require("util");
const path = require("path");
const logger = require("./logger.js");
const processImagesPaths = require("./process-images-paths.js");
const processInnerLinks = require("./process-inner-links.js");

const [readFile, writeFile, exists] = [fs.readFile, fs.writeFile, fs.exists].map(fn =>
  util.promisify(fn),
);

const combineMarkdowns = ({ contents, pathToStatic, mainMdFilename, pathToDocsifyEntryPoint }) => async links => {
  try {
    const files = await Promise.all(
      await links.map(async filename => {
        const fileExist = await exists(filename);

        if (fileExist) {
          let content = await readFile(filename, {
            encoding: "utf8",
          });

          const includes = content.match(/\[.*?\]\((.*?) '\:include'\)/g) || [];
          for (const i of includes) {
            const ma = i.match(/\[.*?\]\((.*?) '\:include'\)/);
            const fn = path.join(path.dirname(filename), ma[1]);
            const incContent = await readFile(fn, { encoding: "utf8" });
            content = content.replace(ma[0], incContent);
          }

          return {
            content,
            name: filename,
          };
        }

        throw new Error(`file ${filename} is not exist, but listed in ${contents}`);
      }),
    );

    const resultFilePath = path.resolve(pathToDocsifyEntryPoint, pathToStatic, mainMdFilename);

    try {
      const content = files
        .map(processInnerLinks)
        .map(processImagesPaths({ pathToStatic, pathToDocsifyEntryPoint }))
        .join("\n\n\n\n");
      await writeFile(resultFilePath, content);
    } catch (e) {
      logger.err("markdown combining error", e);
      throw e;
    }

    return resultFilePath;
  } catch (err) {
    logger.err("combineMarkdowns", err);
    throw err;
  }
};

module.exports = config => ({
  combineMarkdowns: combineMarkdowns(config),
});
