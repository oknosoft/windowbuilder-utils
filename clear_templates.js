/**
 * ### Хвосты характеристик
 *
 * @module  clear_templates
 *
 */

/**
 * ### Переменные окружения
 * DEBUG "wb:*,-not_this"
 * DBPWD admin
 * DBUSER admin
 * COUCHPATH https://dh5.oknosoft.ru:210/wb_
 */

'use strict';

const debug = require('debug')('wb:clear_builder_props');
const PouchDB = require('pouchdb').plugin(require('pouchdb-find'));

debug('required');

// инициализируем параметры сеанса и метаданные
const {DBUSER: username, DBPWD: password, COUCHPATH, BOOKMARK} = process.env;

const src = new PouchDB(COUCHPATH, {
  auth: {username, password},
  skip_setup: true,
  ajax: {timeout: 100000}
});

const limit = 200;

src.info()
  .then((info) => {
    debug(`connected to ${info.host}, doc count: ${info.doc_count}`);
  })
  .then(() => clear_bp(BOOKMARK))
  .then(() => debug(`ok`));

function sleep(time, res) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(res), time);
  });
}

function clear_bp(bookmark) {

  // получаем в ОЗУ все номенклатуры и единицы измерения
  if(!bookmark) {
    bookmark = null;
  }
  debug(`find ${bookmark}`);

  return src.find({
    selector: {
      class_name: 'cat.characteristics',
      obj_delivery_state: 'Шаблон',
    },
    fields: ['_id', '_rev', 'name', 'calc_order'],
    limit,
    bookmark,
  })
    .then(({docs, bookmark}) => {
      if(docs.length) {
        debug(`received ${docs.length} rows`);
        // ищем заказы
        const keys = docs.map((row) => `doc.calc_order|${row.calc_order}`);
        return src.allDocs({keys})
          .then(({rows}) => {
            const set = new Set();
            for(const {key, error} of rows) {
              if(error === 'not_found') {
                set.add(key.substr(15));
              }
            }
            const del = [];
            docs.forEach((doc) => {
              if(set.has(doc.calc_order)) {
                doc._deleted = true;
                del.push(doc);
              }
            });
            return src.bulkDocs(del);
          })
          .then(() => sleep(3000, 0))
          .then(() => clear_bp(bookmark));
      }
    })
    .catch(err => {
      debug(err)
    });
}
