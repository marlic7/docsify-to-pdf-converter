const path = require("path");
const puppeteer = require("puppeteer");
const logger = require("./logger.js");
const runSandboxScript = require("./run-sandbox-script.js");

const renderPdf = async ({
  mainMdFilename,
  pathToStatic,
  pathToPublic,
  pdfOptions,
  docsifyRendererPort,
  emulateMedia,
  $docsify,
}) => {
  const browser = await puppeteer.launch({
    defaultViewport: {
      width: 1200,
      height: 1000,
    },
    args: ['--no-sandbox']
  });
  try {
    const mainMdFilenameWithoutExt = path.parse(mainMdFilename).name;
    const docsifyUrl = `http://127.0.0.1:${docsifyRendererPort}/#/${pathToStatic}/${mainMdFilenameWithoutExt}`;

    const page = await browser.newPage();

    page.on('console', msg => {
      for (let i = 0; i < msg.args().length; ++i) {
        console.log(`${i}: ${msg.args()[i]}`);
      }
    });

    // Inject $docsify object from package.json based on provided key.
    await page.evaluateOnNewDocument(x => window.$docsify = x, $docsify[process.argv.slice(2)[0] || "default"]);
    await page.goto(docsifyUrl, { waitUntil: "networkidle0" });

    const renderProcessingErrors = await runSandboxScript(page, {
      mainMdFilenameWithoutExt,
      pathToStatic,
    });

    if (renderProcessingErrors.length)
      logger.warn("anchors processing errors", renderProcessingErrors);

    await page.emulateMedia(emulateMedia);
    await page.pdf({
      ...pdfOptions,
      path: path.resolve(pathToPublic),
    });

    return await browser.close();
  } catch (e) {
    await browser.close();
    throw e;
  }
};

const htmlToPdf = ({
  mainMdFilename,
  pathToStatic,
  pathToPublic,
  pdfOptions,
  removeTemp,
  docsifyRendererPort,
  emulateMedia,
  $docsify,
}) => async () => {
  const { closeProcess } = require("./utils.js")({ pathToStatic, removeTemp });
  try {
    return await renderPdf({
      mainMdFilename,
      pathToStatic,
      pathToPublic,
      pdfOptions,
      docsifyRendererPort,
      emulateMedia,
      $docsify,
    });
  } catch (err) {
    logger.err("puppeteer renderer error:", err);
    await closeProcess(1);
  }
};

module.exports = config => ({
  htmlToPdf: htmlToPdf(config),
});
