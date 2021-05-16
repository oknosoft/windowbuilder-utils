/**
 * ### Перенумерация документов для кристаллита
 *
 * @module  clear_bars
 *
 */

/**
 * ### Переменные окружения
 * DEBUG "wb:*,-not_this"
 * DBPWD admin
 * DBUSER admin
 * COUCHPATH http://oknosoft.ecookna.ru:5984/pl_events
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

const limit = 60;

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
      builder_props: {$regex: '{"0":'}
    },
    limit,
    bookmark,
  })
    .then(({docs, bookmark}) => {
      if(docs.length) {
        debug(`received ${docs.length} rows`);
        return src.bulkDocs(docs.map((row) => {
          delete row.builder_props;
          return row;
        }))
          .then(() => sleep(5000, 0))
          .then(() => clear_bp(bookmark));
      }
    })
    .catch(err => {
      debug(err)
    });
}
