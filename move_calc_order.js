/**
 * ### Модуль переноса заказа с характеристиками продукций
 *
 * @module  move_calc_order
 *
 * Created 09.01.2019
 */

/**
 * ### Переменные окружения
 * DEBUG "wb:*,-not_this"
 * ZONE 21
 * DBUSER admin
 * DBPWD admin
 * COUCHPATH http://cou221:5984/wb_
 * DBUSERDST admin
 * DBPWDDST admin
 * COUCHPATHDST http://cou221:5984/wb_
 */

'use strict';

const debug = require('debug')('wb:move_calc_order');
const PouchDB = require('./pouchdb')
  .plugin(require('pouchdb-find'));

debug('required');

const yargs = require('yargs')
  .usage('Usage: $0 [options] <command>')
  .demand(1)
  .strict()
  .alias('s', 'source').nargs('s', 1).describe('s', 'Source database')
  .alias('d', 'destination').nargs('d', 1).describe('d', 'Destination database')
  .version('v', 'Show version', '0.0.1').alias('v', 'version')
  .help('h').alias('h', 'help')
  .example('node move_calc_order number_doc 00-000-0000', 'Move calc_order with number document `00-000-0000`, database by default wb_21_doc')
  .example('node move_calc_order -s wb_21_doc -d wb_21_doc number_doc 00-000-0000', 'Move calc_order with number document `00-000-0000` from database wb_21_doc to wb_21_doc')
  .command(
    'number_doc [name]',
    'Move calc_order with number document `name`',
    yargs => yargs.positional('name', {type: 'string', describe: 'Empty number_doc name'}),
    args => {
      const { s, d, name } = args;
      if (name) {

        // инициализируем параметры сеанса и метаданные
        const {ZONE, DBUSER, DBPWD, COUCHPATH, DBPWDDST, DBUSERDST, COUCHPATHDST} = process.env;
        const prefix = 'wb_';

        const dbuserdst = DBUSERDST || DBUSER;
        const dbpwddst = DBPWDDST || DBPWD;
        const couchpathdst = COUCHPATHDST || COUCHPATH;

        const path_src = s ? `${COUCHPATH.replace(prefix, '')}${s}` : `${COUCHPATH}${ZONE}_doc`;
        const path_dst = d ? `${couchpathdst.replace(prefix, '')}${d}` : `${couchpathdst}${ZONE}_doc`;
        if (path_src === path_dst) {
          console.log(`paths to source and destination databases must be different`);
          return;
        }

        const src = new PouchDB(path_src, {
          auth: {
            username: DBUSER,
            password: DBPWD
          },
          skip_setup: true,
          ajax: {timeout: 100000}
        });

        const dst = new PouchDB(path_dst, {
          auth: {
            username: dbuserdst,
            password: dbpwddst
          },
          skip_setup: true,
          ajax: {timeout: 100000}
        });

        src.info()
          .then(info => {
            console.log(`connected to ${info.host}, doc count: ${info.doc_count}`);
            return dst.info()
              .then(info => {
                console.log(`connected to ${info.host}, doc count: ${info.doc_count}`);
              });
          })
          .then(() => move_calc_order(src, dst, name))
          .then(() => {
            console.log('all done');
          })
          .catch(err => {
            console.log(`error find ${name}: ${err && err.message}`);
          });
      }
      else {
        yargs.showHelp();
        process.exit(1);
      }
    }
  )
  .epilog('\nMore information about the library: https://github.com/oknosoft/windowbuilder');

const {argv} = yargs;
if(!argv._.length){
  yargs.showHelp();
  process.exit(1);
}

function move_calc_order(src, dst, number_doc) {
  console.log(`processing ${number_doc} started`);

  return src.find({
    selector: {
      class_name: 'doc.calc_order',
      number_doc
    }
  })
    .then(async ({ docs }) => {
      if (!docs.length) {
        return true;
      }

      // обрабатываем найденные заказы
      for (const doc of docs) {
        
        // загружаем заказ с прикрепленными файлами
        await src.get(doc._id, { attachments: true })
          .then(async res => {
            console.log(`${res._id} loaded successful`);
            
            // переносим характеристики продукций
            for (const prod of res.production) {
              // загружаем характеристику
              await src.get(`cat.characteristics|${prod.characteristic}`)
                .then(async res => {
                  console.log(`${res._id} loaded successful`);
                  
                  // записываем характеристику в новое место
                  return update_doc(src, dst, res);
                })
                .then(() => {
                  console.log(`cat.characteristics|${prod.characteristic} updated successful`);
                })
                .catch(err => {
                  console.log(`error get cat.characteristics|${prod.characteristic}: ${err && err.message}`);
                });
            }

            // записываем документ заказа в новое место
            return update_doc(src, dst, res);
          })
          .then(() => {
            console.log(`${doc._id} updated successful`);
          })
          .catch(err => {
            console.log(`error get ${doc._id}: ${err && err.message}`);
          });
      }
    });
}

function update_doc(src, dst, doc) {
  const rows = [ doc ];
  // добавляем документы в новое место
  return dst.bulkDocs(rows, { new_edits: false })
    .then(res => {
      // удаляем документы в старом месте
      for (const doc of rows) {
        for (const _fld in doc) {
          if (_fld[0] !== '_') {
            delete doc[_fld];
          }
        }
        doc._deleted = true;
      }
      return src.bulkDocs(rows)
        .catch(err => {
          console.log(`error update ${doc._id} in source: ${err && err.message}`);
        });
    })
    .catch(err => {
      console.log(`error update ${doc._id} in destination: ${err && err.message}`);
    });
}
