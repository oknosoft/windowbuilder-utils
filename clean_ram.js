/**
 * ### Модуль прочистки базы ram
 *
 * @module  clean_ram
 *
 * Created 03.07.2019
 */

/**
 * ### Переменные окружения
 * DEBUG "wb:*,-not_this"
 * ZONE 21
 * DBUSER admin
 * DBPWD admin
 * COUCHPATH http://cou221:5984/wb_
 * ZONEDST 8
 * DBUSERDST admin
 * DBPWDDST admin
 * COUCHPATHDST http://cou221:5984/wb_
 */

'use strict';

const debug = require('debug')('wb:clean_ram');
const PouchDB = require('./pouchdb')
  .plugin(require('pouchdb-find'));

debug('required');

// инициализируем параметры сеанса и метаданные
const {ZONE, DBUSER, DBPWD, COUCHPATH, ZONEDST, DBPWDDST, DBUSERDST, COUCHPATHDST} = process.env;

const src = new PouchDB(`${COUCHPATH}${ZONE}_ram`, {
  auth: {
    username: DBUSER,
    password: DBPWD
  },
  skip_setup: true,
  ajax: {timeout: 100000}
});

const dst = new PouchDB(`${COUCHPATHDST}${ZONEDST}_ram`, {
  auth: {
    username: DBUSERDST,
    password: DBPWDDST
  },
  skip_setup: true,
  ajax: {timeout: 100000}
});

const opt = {
  include_docs: true,
  attachments: true,
  startkey: '',
  endkey: '\u0fff',
  limit: 1000,
};

let processed_docs = 0, cleaned_docs = 0;

return src.info()
  .then(info => {
    console.log(`connected to ${info.host}, doc count: ${info.doc_count}`);
    return dst.info()
      .then(info => {
        console.log(`connected to ${info.host}, doc count: ${info.doc_count}`);
      });
  })
  .then(() => {
    return clean_ram(src, dst, opt);
  })
  .catch(err => {
    console.log(`error clean ram: ${err && err.message}`);
  });


function clean_ram(src, dst, opt) {
  return dst.allDocs(opt)
    .then(({rows}) => {
      // повторяем, пока есть данные
      if (rows.length) {

        // обновляем ключ для следующей выборки
        opt.startkey = rows[rows.length - 1].key;
        opt.skip = 1;

        // чистим документы
        return clean_docs(rows, src, dst)
          .then(() => {
            return clean_ram(src, dst, opt);
          });
      }
    });
}

function check_zone(doc) {
  return (doc.zones && doc.zones.search(`'${ZONEDST}'`) != -1 && doc.captured === false) ||
    (doc.direct_zones && doc.direct_zones.search(`'${ZONEDST}'`) != -1) ||
    (doc.class_name === 'cch.predefined_elmnts' && [0, ZONEDST].includes(doc.zone));
}

async function clean_docs(docs, src, dst) {
  for (let {doc} of docs) {
    // проверяем принадлежность к зоне в базе назначения
    if (doc && check_zone(doc)) {
      await src.get(doc._id)
        .then(res => {
          // если не принадлежит к зоне в базе источнике, удаляем документ
          if (!check_zone(res)) {
            return remove_doc(dst, doc);
          }
        })
        .catch(err => {
          // также чистим, если не был найден или удален
          if (err.error === "not_found") {
            return remove_doc(dst, doc);
          }
        });
    }
  }

  processed_docs += docs.length;
  console.log(`${processed_docs} docs processed, cleaned ${cleaned_docs}`);
}

function remove_doc(db, doc) {
  // удаляем документ
  doc._deleted = true;
  return db.put(doc)
    .then(res => {
      console.log(`${doc._id} - ${doc.name}`);
      cleaned_docs++;
    })
    .catch(err => {
      console.log(`error remove ${doc._id}: ${err && err.message}`);
    });
}
