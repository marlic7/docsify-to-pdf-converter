const fs = require("fs");
const util = require("util");
const path = require("path");
const rimraf = require("rimraf");
require("colors");

const logger = require("./logger.js");

const [mkdir, exists] = [fs.mkdir, fs.exists].map(fn => util.promisify(fn));

const safetyMkdir = async rawPath => {
  const resolvedPath = path.resolve(rawPath);

  const isExist = await exists(resolvedPath);

  if (!isExist) {
    return await mkdir(resolvedPath);
  }

  return Promise.resolve();
};

const removeArtifacts = async paths =>
  Promise.all(paths.map(path => new Promise(resolve => rimraf(path, resolve))));

const prepareEnv = ({ pathToStatic, pathToPublic, pathToDocsifyEntryPoint }) => () => {
  const pathToStaticDir = path.resolve(pathToDocsifyEntryPoint, pathToStatic);
  const pathToPublicDir = path.dirname(path.resolve(pathToPublic));

  return Promise.all([safetyMkdir(pathToStaticDir), safetyMkdir(pathToPublicDir)]).catch(err => {
    logger.err("prepareEnv", err);
  });
};

const cleanUp = ({ pathToStatic, pathToPublic, removeTemp, pathToDocsifyEntryPoint }) => async () => {
  const isExist = await exists(path.resolve(pathToDocsifyEntryPoint, pathToStatic));

  if (!isExist) {
    return Promise.resolve();
  }

  return removeArtifacts([path.resolve(pathToDocsifyEntryPoint, pathToStatic)]);
};

const closeProcess = ({ pathToStatic, removeTemp, pathToDocsifyEntryPoint }) => async code => {
  if (removeTemp) {
    await removeArtifacts([path.resolve(pathToDocsifyEntryPoint,pathToStatic)]);
  }

  return process.exit(code);
};

module.exports = config => ({
  prepareEnv: prepareEnv(config),
  cleanUp: cleanUp(config),
  closeProcess: closeProcess(config),
});
