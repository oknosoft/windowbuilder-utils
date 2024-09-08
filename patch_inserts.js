/**
 * ### Пример групповой замены реквизита
 *
 * Created 24.02.2018
 */

/**
 * ### Переменные окружения
 * DEBUG "wb:*,-not_this"
 * ZONE 92
 * DBPWD admin
 * DBUSER admin
 * COUCHPATH http://cou221:5984/wb_
 */

'use strict';
process.env.DEBUG = "wb:*,-not_this";
const debug = require('debug')('wb:patch');
const PouchDB = require('pouchdb').plugin(require('pouchdb-find'));

debug('required');

// инициализируем параметры сеанса и метаданные
const {DBUSER, DBPWD, COUCHPATH='http://alutech2.oknosoft.ru:5980/wb_', ZONE=92} = process.env;
// будем заменять 10000 на 7000
const lmaxOld = 10000;
const lmax = 7000;
const limit = 100000;

const db = new PouchDB(`${COUCHPATH}${ZONE}_ram`, {
  auth: {username: DBUSER, password: DBPWD},
  skip_setup: true,
  ajax: {timeout: 100000}
});

db.info()
  .then((info) => {
    debug(`connected to ${info.host}, doc count: ${info.doc_count}`);
  })
  .then(execute)
  .then(() => debug(`ok`));

function execute() {

  // получаем все вставки типа профиль с ограничением длины по умолчанию
  return db.find({
    selector: {
      class_name: 'cat.inserts',
      insert_type: 'Профиль',
      lmax: lmaxOld,
    },
    limit,
  })
    .then(({docs}) => {
      debug(`received ${docs.length} rows`);
      for(const doc of docs) {
        doc.lmax = lmax;
      }
      return db.bulkDocs(docs);
    })
    .then((res) => {
      debug(`updated ${res.length} rows`);
    })
    .catch(debug);
}
