/**
 * ### Модуль записи данных из couchdb в файл *.json
 *
 * @module restore
 *
 * Created by Evgeniy Malyarov on 16.06.2018.
 */

/**
 * ### Переменные окружения
 * DEBUG "wb:*,-not_this"
 * DBPWD admin
 * DBUSER admin
 * COUCHPATH http://cou221:5984/wb_
 */

'use strict';

const debug = require('debug')('wb:backup');
const PouchDB = require('./pouchdb');
const fs = require('fs');
const JSZip = require('jszip');

const yargs = require('yargs')
  .demand(1)
  .strict()
  .version('v', 'Show version', '0.0.1').alias('v', 'version')
  .help('h').alias('h', 'help')
  .example('node backup database wb_21_doc', 'backup database `wb_21_doc` to `wb_21_doc.json` file')
  .command(
    'database [name]',
    'backup database',
    (yargs) => yargs.positional('name', {type: 'string', describe: 'empty database name'}),
    ({name}) => {
      if(name) {

        // получаем параметры сеанса
        const {DBUSER, DBPWD, COUCHPATH} = process.env;
        const prefix = 'wb_';

        // подключаемся к базе данных
        const src = new PouchDB(`${COUCHPATH.replace(prefix, '')}${name}`, {
          auth: {
            username: DBUSER,
            password: DBPWD
          },
          skip_setup: true,
          ajax: {timeout: 100000}
        });

        let ind = 0;
        function add (rows) {
          return new Promise((resolve, reject) => {
            let chank = '';
            for(const row of rows) {
              chank += JSON.stringify(row.doc) + '\n';
            }
            const zip = new JSZip();
            ind++;
            let suffix = ind.toString();
            while (suffix.length < 5) {
              suffix = '0' + suffix;
            }
            const file = fs.createWriteStream(`${name}_${suffix}.zip`);
            zip.file(`${name}_${ind}.json`, chank, {
              compression: 'DEFLATE',
              compressionOptions: {level: 9}
            });
            zip.generateNodeStream({streamFiles:true})
              .pipe(file)
              .on('finish', function () {
                // JSZip generates a readable stream with a "end" event,
                // but is piped here in a writable stream which emits a "finish" event.
                resolve();
              });
          });
        }

        const opt = {
          include_docs: true,
          attachments: true,
          startkey: '',
          endkey: '\u0fff',
          limit: 3000,
        }

        src.info()
          .then((info) => {
            debug(`connected to ${info.host}, doc count: ${info.doc_count}`);
            return security(src, name);
          })
          .then(() => step(src, add, opt))
          .then(() => debug('all done'))
          .catch((err) => {
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

debug('required');
const {argv} = yargs;
if(!argv._.length){
  yargs.showHelp();
  process.exit(1);
}

let docs = 0;
const mb = 1024 * 1024;

function security(src, name) {
  return src.get('_security')
    .then((security) => new Promise((resolve, reject) => {
      fs.writeFile(`${name}_security.json`, JSON.stringify(security), 'utf8', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
          debug(`Записан ${name}_security.json`);
        }
      });
    }));
}

function step(src, add, opt) {
  return src.allDocs(opt)
    .then(({rows}) => {
      // повторяем, пока есть данные
      if(rows.length) {

        // обновляем ключ для следующей выборки
        opt.startkey = rows[rows.length - 1].key;
        opt.skip = 1;
        docs += rows.length;
        process.stdout.write(`\u001b[2K\u001b[0E\t${docs} docs written`);

        // записываем в stream
        return add(rows)
          .then(() => {
            return step(src, add, opt);
          });
      }
    });
}
