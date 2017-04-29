import 'colors';
import args from 'commander';
import fs from 'fs';
import Promise from 'bluebird';
import Resolver from './Resolver';
import Downloader from './Downloader';
import Archiver from './Archiver';
import PBError from './PBError';

const OUT_DIR = '.package-bundle';

args
  .version(require('../package').version)
  .usage('<packages...> [options] \n  where <packages> are in the format: ' +
    '[@scope/]<pkg>[@<tag | version | range>]')
  .alias('pb')
  .description('Create a bundle of packages including their dependencies in archive format')
  .option('-d, --dev', 'include dev dependencies')
  .option('-o, --optional', 'include optional dependencies')
  .option('-f, --flat', 'save in a flat file structure, instead of individual folders')
  .option('-z, --no-archive', 'leave dependencies in folder, and don\'t archive')
  .option('-x, --no-cache', 'don\'t use cache file to avoid repeat downloads')
  .option('-O, --out-file <file>', 'output file name')
  .option('-a, --all-versions', 'download all versions of specified packages')
  .option('-A, --all-versions-recursive', 'download all versions of specified packages and dependencies')
  .option('-c, --concurrency <n>', 'number of requests to make at the same time - default=50', parseInt)
  .parse(process.argv);


const resolver = new Resolver(args);
const downloader = new Downloader(args);
const archiver = new Archiver(args);
const startTime = Date.now();

function init() {
  return Promise.try(() => {
    if (fs.existsSync(OUT_DIR)) {
      throw new PBError(`Output dir "${OUT_DIR}" already exists.`, 'error');
    }
  });
}

function finish(time) {
  const seconds = time / 1000;
  console.log(`${'success'.green}: completed in ${seconds}s`);
}

init()
  .then(() => resolver.init())
  .then(() => downloader.init(resolver.downloads))
  .then(() => args.archive && archiver.init(downloader.totalSize))
  .catch(PBError, err => console.log(err.prettyMessage))
  .then(() => args.archive && Downloader.cleanUp())
  .then(() => finish(Date.now() - startTime))
  .catch(err => console.log(err.stack));