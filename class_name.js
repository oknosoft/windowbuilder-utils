/**
 * ### Проверка заполненности class_name
 *
 * Created 13.03.2018
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

const debug = require('debug')('wb:move-svgs');
const PouchDB = require('./pouchdb');

debug('required');

// инициализируем параметры сеанса и метаданные
const {DBUSER, DBPWD, COUCHPATH, ZONE} = process.env;
const prefix = 'wb_';

const db = new PouchDB(`${COUCHPATH}${ZONE}_doc`, {
  auth: {
    username: DBUSER,
    password: DBPWD
  },
  skip_setup: true,
  ajax: {timeout: 100000}
});

const opt = {
  startkey: '',
  endkey: '\u0fff',
  limit: 100,
  include_docs: true,
};

db.info()
  .then((info) => {
    debug(`connected to ${info.host}, doc count: ${info.doc_count}`);
    return db.allDocs(opt);
  })
  .then(class_name);


function class_name({rows}) {
  if(rows && rows.length) {
    const docs = [];
    for(const {doc} of rows) {
      const parts = doc._id.split('|');
      if(parts.length > 1 && !doc.class_name) {
        doc.class_name = parts[0];
        docs.push(doc);
      }
    }
    return db.bulkDocs(docs)
      .then(() => {
        if(rows.length === 100) {
          opt.startkey = rows[rows.length -1].doc._id;
          opt.skip = 1;
          return db.allDocs(opt)
            .then(class_name);
        }
      });
  }


}
