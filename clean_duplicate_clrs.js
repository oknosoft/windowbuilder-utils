/**
 * ### Модуль прочистки дубликатов цветов
 *
 * @module  clean_duplicate_clrs
 *
 * Created 14.08.2019
 */

/**
 * ### Переменные окружения
 * DEBUG "wb:*,-not_this"
 * ZONE 21
 * DBUSER admin
 * DBPWD admin
 * COUCHPATH http://cou221:5984/wb_
 * COUCHDBS http://cou221:5984/wb_21_doc
 */

'use strict';

const debug = require('debug')('wb:clean_duplicate_clrs');
const PouchDB = require('./pouchdb')
  .plugin(require('pouchdb-find'));

debug('required');

// инициализируем параметры сеанса и метаданные
const {ZONE, DBUSER, DBPWD, COUCHPATH, COUCHDBS} = process.env;

const ram = new PouchDB(`${COUCHPATH}${ZONE}_ram`, {
  auth: {
    username: DBUSER,
    password: DBPWD
  },
  skip_setup: true,
  ajax: {timeout: 100000}
});

const duplicates = [];
const composite_clrs = new Map();
const blank_guid = "00000000-0000-0000-0000-000000000000";
let processed_docs = 0, changed_docs = 0;

return ram.info()
  .then((info) => {
    console.log(`connected to ${info.host}, doc count: ${info.doc_count}`);

    return clean_duplicate_clrs(ram)
      .then((res) => {
        console.log('done');
      });
  })
  .catch(err => {
    console.log(`error clean duplicate colors: ${err && err.message}`);
  });

function clean_duplicate_clrs(ram) {
  return ram.allDocs({
    include_docs: true,
    startkey: 'cat.clrs|00',
    endkey: 'cat.clrs|15',
  })
    .then(async ({rows}) => {
      if (rows.length) {
        const docs = rows.map(row => row.doc);

        // заполняем справочники
        create_dict(docs);

        const dupls = duplicates.reduce((acc, cur) => cur.rows.length > 1 ? acc + 1 : acc, 0);
        console.log(`${dupls} colors for replace`);
        console.log(`${duplicates.reduce((acc, cur) => acc + cur.rows.length - 1, 0)} total duplicates`);

        return !dupls ? Promise.resolve() : (COUCHDBS || `${COUCHPATH}${ZONE}_doc`).split(',').reduce((prev, url) => {
          return prev.then(() => {
            const doc = new PouchDB(url, {
              auth: {
                username: DBUSER,
                password: DBPWD
              },
              skip_setup: true,
              ajax: {timeout: 100000}
            });

            return doc.info()
              .then(info => {
                console.log(`connected to ${info.host}, doc count: ${info.doc_count}`);

                return replace_clrs(doc, {
                  include_docs: true,
                  attachments: true,
                  startkey: 'cat.characteristics|',
                  endkey: 'cat.characteristics|\ufff0',
                  limit: 1000,
                });
              });
          });
        }, Promise.resolve())
          .then(() => {
            // избавляемся от дубликатов
            return clean_clrs(ram, docs);
          });
      }
    });
}

function clean_clrs(db, docs) {
  // выбираем цвета на удаление
  const clrs = duplicates.reduce((acc, cur) => acc.concat(cur.rows.slice(1)), []);

  // удаляем дубликаты цветов
  docs.forEach((doc) => {
    doc.rows = doc.rows.reduce((acc, cur) => {
      if (!clrs.includes(cur.ref)) {
        acc.push(cur);
      }
      return acc;
    }, []);
  });

  return db.bulkDocs(docs);
}

function create_dict(docs) {
  for (let item of docs) {
    for (let row of item.rows) {
      if (!row.clr_in || !row.clr_out || row.clr_in === blank_guid || row.clr_out === blank_guid) {
        continue;
      }

      let cur = duplicates.findIndex((elem) => elem.clr_in === row.clr_in && elem.clr_out === row.clr_out);
      if (cur === -1) {
        duplicates.push({
          clr_in: row.clr_in,
          clr_out: row.clr_out,
          rows: []
        });
        cur = duplicates.length - 1;
      }

      duplicates[cur].rows.push(row.ref);
      composite_clrs.set(row.ref, cur);
    }
  }

  // избавляемся от записей без дубликатов
  const tmp = [];
  composite_clrs.forEach((value, key, map) => {
    if (duplicates[value].rows.length === 1) {
      tmp.push(key);
    }
  });
  tmp.forEach(key => composite_clrs.delete(key));
}

function replace_clrs(db, opt) {
  return db.allDocs(opt)
    .then(({rows}) => {
      if (rows.length) {
        let docs = rows.map(row => row.doc);
        processed_docs += docs.length;

        docs = change_characteristics(docs);
        changed_docs += docs.length;

        console.log(`${processed_docs} characteristics processed, changed ${changed_docs}`);

        // обновляем ключ для следующей выборки
        opt.startkey = rows[rows.length - 1].key;
        opt.skip = 1;

        // меняем характеристики
        return db.bulkDocs(docs)
          .then(() => {
            return replace_clrs(db, opt);
          });
      }
    });
}

function change_characteristics(docs) {
  return docs.reduce((acc, doc) => {
    let changed = false;
    // цвет изделия
    if (is_replace(doc.clr)) {
      doc.clr = duplicates[composite_clrs.get(doc.clr)].rows[0];
      changed = true;
    }
    // цвет в координатах, составе заполнения, вставках и спецификации
    ['coordinates', 'glass_specification', 'inserts', 'specification'].map((val) => {
      doc.hasOwnProperty(val) && (doc[val] instanceof Array) && doc[val].forEach(row => {
        if (is_replace(row.clr)) {
          row.clr = duplicates[composite_clrs.get(row.clr)].rows[0];
          changed = true;
        }
      });
    });

    if (changed) {
      acc.push(doc);
      console.log(`${doc._id} changed`);
    }
    return acc;
  }, []);
}

function is_replace(clr) {
  return composite_clrs.has(clr) && duplicates[composite_clrs.get(clr)].rows[0] !== clr;
}
