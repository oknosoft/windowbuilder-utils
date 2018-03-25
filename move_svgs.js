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
const PouchDB = require('./pouchdb')
  .plugin(require('pouchdb-find'));

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

  return db.find({
    selector: {
      class_name: 'cat.characteristics',
      _attachments: {$ne: null}
    },
    limit: 100,
  })
    .then(({docs}) => {
      // Для продукций заказа получаем вложения
      const aatt = [];
      for(const {_id} of docs){
        aatt.push(db.getAttachment(_id, 'svg')
          .then((att) => ({ref: _id, att: att}))
          .catch((err) => {}));
      };
      return Promise.all(aatt)
        .then((aatt) => ({docs, aatt}));
    })
    .then((res) => {
      const aatt = [];
      for(const {ref, att} of res.aatt) {
        if(att instanceof Buffer && att.length /* att instanceof Blob && att.size */) {
          res.docs.some((obj) => {
            if(obj._id === ref) {
              obj.svg = att.toString();
              delete obj._attachments;
              return true;
            }
          })
        }
      }
      return db.bulkDocs(res.docs)
        .then((rows) => {
          if(res.docs.length === 100) {
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
