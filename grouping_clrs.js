/**
 * ### Модуль группировки цветов
 *
 * @module  grouping_clrs
 *
 * Created 17.10.2019
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

const debug = require('debug')('wb:grouping_clrs');
const PouchDB = require('./pouchdb')
  .plugin(require('pouchdb-find'));
const crc32 = require('./crc32');

debug('required');

// инициализируем параметры сеанса и метаданные
const {ZONE, DBUSER, DBPWD, COUCHPATH, COUCHDBS} = process.env;
// счётчики состояния
let processed_count = 0, added_count = 0;

return grouping_clrs()
  .then((res) => {
    console.log('done');
  })
  .catch(err => {
    console.log(`error grouping colors: ${err && err.message}`);
  });


function grouping_clrs() {
  const groups = [];
  const urls = [`${COUCHPATH}${ZONE}_ram`].concat((COUCHDBS || '').split(','));

  return urls.reduce((prev, url) => {
    return prev.then(() => {
      const db = new PouchDB(url, {
        auth: {
          username: DBUSER,
          password: DBPWD
        },
        skip_setup: true,
        ajax: {timeout: 100000}
      });

      return db.info()
        .then(info => {
          console.log(`connected to ${info.host}, doc count: ${info.doc_count}`);

          // выборку цветов делаем сгруппированных и нет
          return update_groups(db, {
            include_docs: true,
            startkey: 'cat.clrs|',
            endkey: 'cat.clrs|\ufff0',
            limit: 500,
          }, groups);
        });
    });
  }, Promise.resolve())
    .then(() => {
      // обновляем или создаём группы с цветами в первой базе
      return update_clrs(urls[0], groups);
    });
}

function update_clrs(url, groups) {
  const db = new PouchDB(url, {
    auth: {
      username: DBUSER,
      password: DBPWD
    },
    skip_setup: true,
    ajax: {timeout: 100000}
  });

  return db.info()
    .then(info => {
      console.log(`connected to ${info.host}, doc count: ${info.doc_count}`);

      return db.allDocs({
        //startkey: 'cat.clrs|00',
        //endkey: 'cat.clrs|15',
        keys : [
          "cat.clrs|00", "cat.clrs|01", "cat.clrs|02", "cat.clrs|03", "cat.clrs|04", "cat.clrs|05", "cat.clrs|06", "cat.clrs|07",
          "cat.clrs|08", "cat.clrs|09", "cat.clrs|10", "cat.clrs|11", "cat.clrs|12", "cat.clrs|13", "cat.clrs|14", "cat.clrs|15"
        ]
      })
        .then(({rows}) => {
          // подмешиваем ревизии имеющихся групп
          if (rows && rows.length) {
            groups.forEach(row => {
              let found = rows.findIndex(elem => elem.id === row._id);
              if (found !== -1) {
                row._rev = rows[found].value.rev;
              }
            });
          }

          function bulkDocs(db, docs) {
            return db.bulkDocs(docs)
              .catch(err => {
                console.error(`error in clean_clrs: ${err && err.message}`);
                console.log('trying again');

                return bulkDocs(db, docs);
              });
          };

          return bulkDocs(db, groups);
        });
    });
}

/**
 * Метод дополнения лидирующими нулями число
 * @method pad
 */
function pad(s, size) {
  while (s.length < (size || 2)) {s = "0" + s;}
  return s;
};

function update_groups(db, opt, groups) {
  return db.allDocs(opt)
    .then(({rows}) => {
      if (rows.length) {
        rows.forEach(row => {
          // для сгруппированных цветов
          if (row.doc.hasOwnProperty('rows')) {
            let found = groups.findIndex(elem => elem._id === row.doc._id);
            if (found === -1) {
              groups.push({_id: row.doc._id, class_name: 'cat.clrs', rows: []});
              found = groups.length - 1;
            }
            row.doc.rows.forEach(row => {
              processed_count++;
              if (groups[found].rows.findIndex(elem => elem.ref === row.ref) === -1) {
                groups[found].rows.push(row);
                added_count++;
              }
            });
          // для цветов не в группах
          } else {
            row.doc.ref = row.doc._id.split('|')[1];
            const index = Math.floor(crc32(row.doc.ref) / 268435455);
            const _id = `cat.clrs|${pad(index)}`;
            let found = groups.findIndex(elem => elem._id === _id);
            if (found === -1) {
              groups.push({_id, class_name: 'cat.clrs', rows: []});
              found = groups.length - 1;
            }
            processed_count++;
            if (groups[found].rows.findIndex(elem => elem.ref === row.doc.ref) === -1) {
              delete row.doc._id;
              delete row.doc.class_name;
              delete row.doc._rev;
              groups[found].rows.push(row.doc);
              added_count++;
            }
          }
        });

        console.log(`${processed_count} colors processed, added ${added_count}`);

        // обновляем ключ для следующей выборки
        opt.startkey = rows[rows.length - 1].key;
        opt.skip = 1;

        return update_groups(db, opt);
      }
    })
    .catch(err => {
      console.error(`error in update_groups: ${err && err.message}`);
      console.log('trying again');

      return update_groups(db, opt);
    });
}
