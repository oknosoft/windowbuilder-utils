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
 * ZONE 21
 * DBPWD admin
 * DBUSER admin
 * COUCHPATH http://cou221:5984/wb_
 */

'use strict';

const debug = require('debug')('wb:backup');
const PouchDB = require('./pouchdb');
const fs = require('fs');

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

        const stream = fs.createWriteStream(`${name}.json`);

        const opt = {
          include_docs: true,
          attachments: true,
          startkey: '',
          endkey: '\u0fff',
          limit: 2000,
        }

        src.info()
          .then((info) => {
            debug(`connected to ${info.host}, doc count: ${info.doc_count}`);
            return step(src, stream, opt);
          })
          .then(() => {
            debug('all done');
            process.exit(0);
          })
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

function step(src, stream, opt) {
  return src.allDocs(opt)
    .then((res) => {
      // записываем в stream
      for(const row of res.rows) {
        stream.write(JSON.stringify(row.doc) + '\n');
      }
      if(res.rows.length) {
        opt.startkey = res.rows[res.rows.length - 1].key;
        opt.skip = 1;
        docs += res.rows.length;
        process.stdout.write(`\u001b[2K\u001b[0E\t${(stream.bytesWritten / mb).toFixed(1)}Mb read, ${docs} docs written`);
        return step(src, stream, opt);
      }
      else {
        stream.end();
      }
    });
}
