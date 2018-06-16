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

debug('required');


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
        const prefix = 'wb_';

        // подключаемся к базе данных
        const dst = new PouchDB(`${COUCHPATH}${ZONE}_${from.indexOf(doc) !== -1 ? 'doc' : 'ram'}`, {
          auth: {
            username: DBUSER,
            password: DBPWD
          },
          ajax: {timeout: 100000}
        });

        dst.info()
          .then((info) => {
            debug(`connected to ${info.host}, doc count: ${info.doc_count}`);

            // в tail (хвост) будем складывать неполные объекты
            let tail = '';
            let docs = 0;

            // открываем файловый поток
            const mb = 1024 * 1024;
            const stream = fs.createReadStream(from, {highWaterMark: mb * 3});
            stream.on('data', (chunk) => {
              // тормозим поток
              stream.pause();
              // делаем синтаксический разбор
              const data = chunk.toString().replace(/,\n/g, '\n').split('\n');
              if(data[0] === '{"new_edits":false,"docs":[') {
                data.splice(0, 1);
              }
              if(tail) {
                data[0] = tail + data[0];
                tail = '';
              }
              const last = data[data.length - 1];
              try {
                if(last === ']}') {
                  data.splice(data.length - 1, 1);
                }
                else {
                  const test = JSON.parse(last)
                }
              }
              catch(err) {
                tail = last;
                data.splice(data.length - 1, 1);
              }
              // отправляем данные в couchdb
              try {
                dst.bulkDocs(data.map((str) => JSON.parse(str)), {new_edits: false})
                  .then((rows) => {
                    docs += data.length;
                    debug(`${stream.bytesRead / mb}Mb read, ${docs} docs written`);
                    stream.resume();
                  })
                  .catch((err) => {
                    debug(err);
                    process.exit(1);
                  });
              }
              catch(err) {
                debug(err);
                process.exit(1);
              }
            });

          })
          .then((res) => {
            debug('all done');
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

const {argv} = yargs;
if(!argv._.length){
  yargs.showHelp();
  process.exit(1);
}
