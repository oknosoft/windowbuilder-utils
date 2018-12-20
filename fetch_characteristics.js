/**
 * Подтягивает характеристики с другого сервера для заказов текущей базы
 *
 * @module fetch_characteristics
 *
 * Created by Evgeniy Malyarov on 20.12.2018.
 */

/**
 * ### Переменные окружения
 * DEBUG "wb:*,-not_this"
 * ZONE 21
 * DBPWD admin
 * DBUSER admin
 * COUCHTARGET https://dh5.oknosoft.ru:221/wb_
 * COUCHSOURCE https://dh2.oknosoft.ru:221/wb_
 */

'use strict';

const debug = require('debug')('wb:revert');
const PouchDB = require('./pouchdb').plugin(require('pouchdb-find'));

debug('required');

// инициализируем параметры сеанса и метаданные
const {DBUSER, DBPWD, COUCHSOURCE, COUCHTARGET, ZONE} = process.env;
const prefix = 'wb_';
const blank_guid = '00000000-0000-0000-0000-000000000000';
const packet = 50;
const buffer = [];
const stat = {
  doc_count: 0,
  prod_count: 0,
};

const src = new PouchDB(`${COUCHSOURCE}${ZONE}_doc`, {
  auth: {
    username: DBUSER,
    password: DBPWD
  },
  skip_setup: true
});

const tgt = new PouchDB(`${COUCHTARGET}${ZONE}_doc`, {
  auth: {
    username: DBUSER,
    password: DBPWD
  },
  skip_setup: true
});

src.info()
  .then((info) => {
    debug(`connected to ${info.host}, doc count: ${info.doc_count}`);
    return tgt.info();
  })
  .then((info) => {
    debug(`connected to ${info.host}, doc count: ${info.doc_count}`);
    return process_fragment();
  })
  .then((res) => {
    debug('all done');
    console.log(stat);
  })
  .catch(err => {
    debug(err);
  });

// обрабатывает заказы пачками по 100
function process_fragment(bookmark) {
  return tgt.find({
    selector: {
      class_name: 'doc.calc_order'
    },
    limit: packet,
    bookmark,
    fields: ['_id', 'date', 'number_doc', 'production']
  })
    .then(({docs, bookmark}) => {
      return docs.reduce(process_doc, Promise.resolve())
        .then(() => {
          if(docs.length === packet) {
            debug(stat);
            return process_fragment(bookmark);
          }
        });
    });
}

// обрабатывает конкретный документ
function process_doc(sum, doc) {
  return sum.then(() => load_production(doc)
    .then((keys) => {
      buffer.push.apply(buffer, keys);
      return buffer.length > packet ? fetch_production(buffer) : Promise.resolve();
    }));
}

// читает продукцию заказа
function load_production(doc) {
  stat.doc_count++;
  if(doc.production) {
    const keys = doc.production
      .filter(({characteristic}) => characteristic && characteristic !== blank_guid)
      .map(({characteristic}) => `cat.characteristics|${characteristic}`);
    return tgt.allDocs({keys, include_docs: false})
      .then(({rows}) => {
        stat.prod_count += rows.length;
        return src.allDocs({keys, include_docs: false})
          .then((docs) => {
            const res = [];
            for(let i = 0; i < docs.rows.length; i++) {
              if(!docs.rows[i].value) {
                continue;
              }
              if(rows[i].value && docs.rows[i].value.rev === rows[i].value.rev) {
                continue;
              }
              res.push(docs.rows[i].key);
            }
            return res;
          })
      });
  }
  return Promise.resolve();
}

// контролирует заполненность и пытается восстановить из версии
function fetch_production() {
  const keys = buffer.splice(0);
  buffer.length = 0;
  return src.allDocs({keys, include_docs: true})
    .then(({rows}) => {
      return tgt.bulkDocs(rows.map((v) => v.doc), {new_edits: false});
    });
}