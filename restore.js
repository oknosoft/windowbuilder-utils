/**
 * ### Модуль чтения данных из файла *.json в couchdb
 *
 * @module restore
 *
 * Created by Evgeniy Malyarov on 16.06.2018.
 */

/**
 * ### Переменные окружения
 * DEBUG "wb:*,-not_this"
 * ZONE 21
 * DBPWD admin
 * DBUSER admin
 * COUCHPATH http://cou221:5984/wb_
 */

'use strict';

const debug = require('debug')('wb:restore');
const PouchDB = require('./pouchdb');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');

debug('required');
const mb = 1024 * 1024;
let docs = 0;

const yargs = require('yargs')
  .demand(1)
  .strict()
  .version('v', 'Show version', '0.0.1').alias('v', 'version')
  .help('h').alias('h', 'help')
  .example('node restore from wb_21_doc.json', 'restore database from `wb_21_doc.json` file')
  .command(
    'from [from]',
    'restore database',
    (yargs) => yargs.positional('from', {type: 'string', describe: 'empty file name'}),
    ({from}) => {
      if(from) {

        // получаем параметры сеанса
        const {DBUSER, DBPWD, COUCHPATH, ZONE} = process.env;

        // подключаемся к базе данных
        const dst = new PouchDB(`${COUCHPATH}${ZONE}_${from.indexOf('doc') !== -1 ? 'doc' : 'ram'}`, {
          auth: {
            username: DBUSER,
            password: DBPWD
          },
          ajax: {timeout: 100000}
        });

        dst.info()
          .then((info) => {
            debug(`connected to ${info.host}, doc count: ${info.doc_count}`);
            restore(from, dst);
          })
          .catch(err => {
            debug(err);
            process.exit(1);
          });

      }
      else {
        yargs.showHelp();
        process.exit(1);
      }
    })
  .epilog('\nMore information about the library: https://github.com/oknosoft/windowbuilder');

function restore(from, dst) {
  // если from указывает на каталог, перебираем файлы архивов
  try{
    if(fs.lstatSync(from).isDirectory()) {
      const files = fs.readdirSync(from).filter((file) => {
        const stat = fs.statSync(path.join(from, file));
        return stat.isFile() && file.indexOf('.zip') !== -1;
      });
      fromFiles(from, files, dst);
    }
    else {
      // открываем файловый поток
      const stream = fs.createReadStream(from, {highWaterMark: mb * 4});
      fromFile(stream, dst)
        .then(() => {
          debug('\nall done');
        })
        .catch(err => {
          debug(err);
          process.exit(1);
        });
    }
  }catch(e){
    debug(err);
    process.exit(1);
  }
}

function fromFiles(from, files, dst) {
  return new Promise((resolve, reject) => {
    if(!files.length) {
      return resolve();
    }
    const file = files.splice(0, 1)[0];
    // read a zip file
    fs.readFile(path.join(from, file), (err, data) => {
      if (err) {
        reject(err);
      }
      JSZip.loadAsync(data).then((zip) => {
        const content = zip.file(file.replace('.zip', '.json'));
        const stream = content.nodeStream();
        fromFile(stream, dst)
          .then(() => {
            resolve();
          })
      });
    });
  })
    .then(() => {
      if(files.length) {
        return fromFiles(from, files, dst);
      }
    });
}

function fromFile(stream, dst) {

  return new Promise((resolve, reject) => {
    // в tail (хвост) будем складывать неполные объекты
    let tail = '';
    let substr = '';
    let finish;

    stream.on('data', (chunk) => {

      substr += chunk.toString();
      if(!finish && substr.length < mb * 4) {
        return;
      }

      // тормозим поток
      stream.pause();
      // делаем синтаксический разбор
      const data = substr.replace(/,\n/g, '\n').split('\n');
      substr = '';
      if(data[0] === '{"new_edits":false,"docs":[' || data[0] === '') {
        data.splice(0, 1);
      }
      if(tail) {
        data[0] = tail + data[0];
        tail = '';
      }
      let last = data[data.length - 1];
      try {
        while(last === '') {
          data.splice(data.length - 1, 1);
          last = data[data.length - 1];
          finish = true;
        }
        if(last === ']}') {
          data.splice(data.length - 1, 1);
          finish = true;
        }
        else {
          const test = JSON.parse(last);
        }
      }
      catch(err) {
        tail = last;
        data.splice(data.length - 1, 1);
      }
      // отправляем данные в couchdb
      try {
        data.length && dst.bulkDocs(data.map((str) => JSON.parse(str)), {new_edits: false})
          .then((rows) => {
            docs += data.length;
            process.stdout.write(`\u001b[2K\u001b[0E\t${stream.bytesRead / mb}Mb read, ${docs} docs written`);
            if(finish) {
              resolve();
            }
            else {
              stream.resume();
            }
          })
          .catch((err) => {
            reject(err);
          });
      }
      catch(err) {
        reject(err);
      }
    })
      .on('end', () => {
        finish = true;
        if(substr) {
          stream.emit('data', new Buffer([]));
        }
      });
  });
}

const {argv} = yargs;
if(!argv._.length){
  yargs.showHelp();
  process.exit(1);
}
