/**
 * ### Перенумерация документов для кристаллита
 *
 * @module  renums
 *
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

const nprefix = "OT0000";
let num = 9927;

src.info()
  .then((info) => {
    debug(`connected to ${info.host}, doc count: ${info.doc_count}`);
    return src.query('doc/number_doc', {
      include_docs: true,
      key: ['doc.calc_order', 2018, 'OT000008302']
    })
  })
  .then((res) => {
    const rows = res.rows.map(({doc}) => {
      let suffix = (++num).toFixed();
      if(suffix.length < 5) {
        suffix = '0' + suffix;
      }
      doc.number_doc = nprefix + suffix;
      return doc;
    });
    return src.bulkDocs(rows);
  })
  .then((res) => {
    debug('all done');
  })
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
