/**
 * ### Модуль поиска документов с конфликтами
 *
 * @module  find_conflicts
 *
 * Created 28.07.2019
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

const debug = require('debug')('wb:find_conflicts');
const PouchDB = require('./pouchdb')
  .plugin(require('pouchdb-find'));

debug('required');

const yargs = require('yargs')
  .usage('Usage: $0 [options] <command>')
  .demand(0)
  .strict()
  .alias('d', 'database').nargs('d', 1).describe('d', 'Database name')
  .version('v', 'Show version', '0.0.1').alias('v', 'version')
  .help('h').alias('h', 'help')
  .example('node find_conflicts -d wb_21_doc', 'Find conflicts in database wb_21_doc')
  .epilog('\nMore information about the library: https://github.com/oknosoft/windowbuilder');

const {argv: {database}} = yargs;

// инициализируем параметры сеанса и метаданные
const {ZONE, DBUSER, DBPWD, COUCHPATH} = process.env;
const prefix = 'wb_';

const path = database ? `${COUCHPATH.replace(prefix, '')}${database}` : `${COUCHPATH}${ZONE}_doc`;

const db = new PouchDB(path, {
  auth: {
    username: DBUSER,
    password: DBPWD
  },
  skip_setup: true,
  ajax: {timeout: 100000}
});

const opt = {
  include_docs: true,
  conflicts: true,
  startkey: '',
  endkey: '\u0fff',
  limit: 10000,
};

let processed_docs = 0, conflicts_docs = 0;

return db.info()
  .then(info => {
    console.log(`connected to ${info.host}, doc count: ${info.doc_count}`);

    const json = {items: {}};
    return find_docs(db, opt, json)
      .then(() => {
        console.log(JSON.stringify(json));
        //process.stdout.write(JSON.stringify(json));
      });
  })
  .catch(err => {
    console.log(`error find conflicts: ${err && err.message}`);
  });


function find_docs(db, opt, res) {
  return db.allDocs(opt)
    .then(({rows}) => {
      // повторяем, пока есть данные
      if (rows.length) {

        // обновляем ключ для следующей выборки
        opt.startkey = rows[rows.length - 1].key;
        opt.skip = 1;

        // ищем документы с конфликтами
        find_conflicts(rows, res);

        return find_docs(db, opt, res);
      }
    });
}

function find_conflicts(docs, res) {
  for (let {doc} of docs) {
    // проверяем наличие конфликтов в документе
    if (doc._conflicts && doc._conflicts.length) {
      const id = doc._id.split('|');
      if (!res.items[id[0]]) {
        res.items[id[0]] = [];
      }
      res.items[id[0]].push({
        ref: id[1],
        name: doc.name || undefined
      });
      
      conflicts_docs++;
    }
  }

  processed_docs += docs.length;
  console.log(`${processed_docs} docs processed, conflicts ${conflicts_docs}`);
}
