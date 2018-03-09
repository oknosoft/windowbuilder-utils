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

db.info()
  .then((info) => {
    debug(`connected to ${info.host}, doc count: ${info.doc_count}`);
  })
  .then(move_svgs);


function move_svgs() {
  const opt = {limit: 100};
  return db.query('svgs', opt)
    .then((res) => {
      // Для продукций заказа получаем вложения
      const aatt = [];
      debug(res.total_rows);
      for(const {id} of res.rows){
        aatt.push(db.getAttachment(id, 'svg')
          .then((att) => ({ref: id, att: att}))
          .catch((err) => {}));
      };
      return Promise.all(aatt);
    })
    .then((res) => {
      const aatt = [];
      for(const {ref, att} of res) {
        if(att instanceof Buffer && att.length /* att instanceof Blob && att.size */) {
          aatt.push(db.get(ref)
            .then((obj) => {
              /* $p.utils.blob_as_text(att) */
              obj.svg = att.toString();
              delete obj._attachments;
              return db.put(obj);
            })
            .catch((err) => {
              debug(err);
            })
          );
        }
      }
      return Promise.all(aatt)
        .then(() => {
          if(aatt.length === 100) {
            return new Promise((resolve, reject) => {
              setTimeout(() => resolve(move_svgs()), 5000);
            });
          }
        });
    })
    .catch(err => {
      debug(err)
    });
}
