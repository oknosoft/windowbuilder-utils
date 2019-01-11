/**
 * ### Модуль восстановления удаленного заказа по номеру
 *
 * @module  undelete_calc_order
 *
 * Created 10.01.2019
 */

/**
 * ### Переменные окружения
 * DEBUG "wb:*,-not_this"
 * ZONE 21
 * DBUSER admin
 * DBPWD admin
 * COUCHPATH http://cou221:5984/wb_
 */

'use strict';

const debug = require('debug')('wb:undelete_calc_order');
const PouchDB = require('./pouchdb')
  .plugin(require('pouchdb-find'));

debug('required');

const yargs = require('yargs')
  .usage('Usage: $0 [options] <command>')
  .demand(1)
  .strict()
  .alias('d', 'database').nargs('d', 1).describe('d', 'Database name')
  .version('v', 'Show version', '0.0.1').alias('v', 'version')
  .help('h').alias('h', 'help')
  .example('node undelete_calc_order number_doc 00-000-0000', 'Undelete calc_order with number document `00-000-0000`, database by default wb_21_doc')
  .example('node undelete_calc_order -d wb_21_doc number_doc 00-000-0000', 'Undelete calc_order with number document `00-000-0000` in database wb_21_doc')
  .command(
    'number_doc [name]',
    'Undelete calc_order with number document `name`',
    yargs => yargs.positional('name', {type: 'string', describe: 'Empty number_doc name'}),
    args => {
      const { d, name } = args;
      if (name) {

        // инициализируем параметры сеанса и метаданные
        const {ZONE, DBUSER, DBPWD, COUCHPATH} = process.env;
        const prefix = 'wb_';

        const path = d ? `${COUCHPATH.replace(prefix, '')}${d}` : `${COUCHPATH}${ZONE}_doc`;

        const db = new PouchDB(path, {
          auth: {
            username: DBUSER,
            password: DBPWD
          },
          skip_setup: true,
          ajax: {timeout: 100000}
        });

        db.info()
          .then(info => {
            console.log(`connected to ${info.host}, doc count: ${info.doc_count}`);
          })
          .then(() => undelete_calc_order(db, name))
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
if (!argv._.length) {
  yargs.showHelp();
  process.exit(1);
}

function undelete_calc_order(db, number_doc) {
  console.log(`processing ${number_doc} started`);

  return find_calc_orders({ orders: [], db, since: 0, limit: 500, number_doc })
    .then(res => {
      return res.reduce((prev, doc) => {
        return prev.then(() => {
          console.log(`processing ${doc._id} started`);

          // удаляем лишние поля
          delete doc._rev;
          delete doc._deleted;

          // обновляем документ
          return db.bulkDocs([ doc ])
            .then(() => {
              console.log(`${doc._id} updated successful`);
            })
            .catch(err => {
              console.log(`error update ${doc._id}: ${err && err.message}`);
            });
        });
      }, Promise.resolve());
    });
}

function find_calc_orders({orders, db, since, limit, number_doc}) {
  return db.changes({ since, limit, include_docs: true, attachments: true })
    .then(res => {
      for (const result of res.results) {
        if (result.deleted && result.doc.number_doc === number_doc) {
          orders.push(result.doc);
        }
      }

      debug(`Last sequence: ${res.last_seq}`);

      return res.results.length < limit ? orders
        : find_calc_orders({ orders, db, since: res.last_seq, limit, number_doc });
    });
}
