/**
 * ### Модуль переноса svg из вложений в реквизит характеристики
 *
 * @module  move_svgs
 *
 * Created 24.02.2018
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

const debug = require('debug')('wb:move_formulas');
const PouchDB = require('./pouchdb')
  .plugin(require('pouchdb-find'));

debug('required');

// инициализируем параметры сеанса и метаданные
const {DBUSER, DBPWD, COUCHPATH, ZONE} = process.env;
const prefix = 'wb_';

const src = new PouchDB(`${COUCHPATH}${ZONE}_doc`, {
  auth: {
    username: DBUSER,
    password: DBPWD
  },
  skip_setup: true,
  ajax: {timeout: 100000}
});

const dst = new PouchDB(`${COUCHPATH}${ZONE}_ram`, {
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
  })
  .then(() => move_docs('cat.formulas'))
  .then(() => move_docs('cch.predefined_elmnts'))
  .then(() => debug('all done'))
  .catch(err => {
    debug(err)
  });


function move_docs(class_name) {

  return src.allDocs({
    limit: 10,
    include_docs: true,
    attachments: true,
    startkey: `${class_name}|`,
    endkey: `${class_name}|\ufff0`,
  })
    .then(({total_rows, rows}) => {
      if(!rows.length) {
        return true;
      }
      // записываем документы в новое место
      rows = rows.map(v => v.doc);
      return dst.bulkDocs(rows, {new_edits: false})
        .then((res) => {
          // удаляем документы в старом месте
          for(const doc of rows) {
            for(const _fld in doc) {
              if(_fld[0] !== '_') {
                delete doc[_fld];
              }
            }
            doc._deleted = true;
          }
          return src.bulkDocs(rows);
        })
      .then((res) => {
        return rows.length === 10 ? move_docs(class_name) : true;
      })
    });
}
