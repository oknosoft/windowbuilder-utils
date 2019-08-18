/**
 * ### Добавляет acl, если не задан
 *
 * @module  add_acl
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

const debug = require('debug')('wb:move_formulas');
const PouchDB = require('../pouchdb')
  .plugin(require('pouchdb-find'));

debug('required');

// инициализируем параметры сеанса и метаданные
const {DBUSER, DBPWD, COUCHPATH, ZONE} = process.env;
const prefix = 'wb_';

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
    //return move_docs('cat.articles');
    return move_docs('chart');
  })
  .then((res) => {
    debug('all done');
  })
  .catch(err => {
    debug(err)
  });


function move_docs(class_name, startkey) {

  return src.allDocs({
    limit: 10,
    include_docs: true,
    attachments: true,
    startkey: startkey || `${class_name}|`,
    endkey: `${class_name}|\ufff0`,
    skip: startkey ? 1 : 0,
  })
    .then(({total_rows, rows}) => {
      if(!rows.length) {
        return true;
      }
      // записываем документы в новое место
      const new_rows = [];
      for(const {doc} of rows) {
        if(!doc.acl) {
          doc.acl = ['_anonymous'];
          new_rows.push(doc);
        }
      }
      return src.bulkDocs(new_rows)
        .then(() => rows);
    })
    .then((rows) => {
      return rows.length === 10 ? move_docs(class_name, rows[9].key) : true;
    });
}
