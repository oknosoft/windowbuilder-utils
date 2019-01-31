/**
 * ### Прибивает паразитные базы и записи sl_users
 *
 * @module  spam
 *
 */

/**
 * ### Переменные окружения
 * DEBUG "wb:*,-not_this"
 * DBPWD admin
 * DBUSER admin
 * COUCHPATH http://cou221:5984/wb_
 */

'use strict';

const debug = require('debug')('wb:spam');
const PouchDB = require('./pouchdb')
  .plugin(require('pouchdb-find'));

debug('required');

// инициализируем параметры сеанса и метаданные
const {DBUSER, DBPWD, COUCHPATH, ZONE} = process.env;
const prefix = 'fl_0_doc$';
const limit = 300;

const src = new PouchDB(COUCHPATH, {
  auth: {
    username: DBUSER,
    password: DBPWD
  },
  skip_setup: true,
  ajax: {timeout: 100000}
});

src.info()
  .then((info) => {
    debug(`connected to ${info.host}, doc count: ${info.doc_count}`);
    return remove_bases();
  })
  .then((res) => {
    debug('all done');
  })
  .catch(err => {
    debug(err)
  });


function remove_bases() {

  // получаем в ОЗУ все номенклатуры и единицы измерения
  return src.find({selector: {name: {$regex: 'http'}}, limit})
    .then(({docs}) => {
      debug(`received ${docs.length} rows`);
      let res = Promise.resolve();
      const del = [];
      for(const doc of docs) {
        del.push({_id: doc._id, _rev: doc._rev, _deleted: true});
        res = res.then(() => {
          const db = new PouchDB(COUCHPATH.replace('sl_users', `${prefix}${doc._id}`), {
            auth: {
              username: DBUSER,
              password: DBPWD
            },
            skip_setup: true
          });
          return db.destroy();
        });
      }
      return res
        .then(() => src.bulkDocs(del))
        .then(() => {
          if(docs.length === limit) {
            return remove_bases();
          }
        });
    })
    .catch(err => {
      debug(err)
    });
}
