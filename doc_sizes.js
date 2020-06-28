/**
 * ### Перенумерация документов для кристаллита
 *
 * @module  clear_bars
 *
 */

/**
 * ### Переменные окружения
 * DEBUG "wb:*,-not_this"
 * DBPWD admin
 * DBUSER admin
 * COUCHPATH http://oknosoft.ecookna.ru:5984/pl_events
 */

'use strict';

const debug = require('debug')('wb:next');
const PouchDB = require('pouchdb')
  .plugin(require('pouchdb-find'));

debug('required');
let dsize = 0;
let prev = 0;
let dcount = 0;

// инициализируем параметры сеанса и метаданные
const {DBUSER, DBPWD, COUCHPATH} = process.env;

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
  })
  .then(next)
  .then(() => debug(`ok`));

function sleep(time, res) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(res), time);
  });
}

function next(bookmark) {

  // получаем в ОЗУ все номенклатуры и единицы измерения
  return src.find({
    selector: {
      class_name: "cat.characteristics"
    },
    limit: 1000,
    bookmark,
  })
    .then(({docs, bookmark}) => {
      if(docs.length) {
        dcount += docs.length;
        for(const doc of docs) {
          const str = JSON.stringify(doc);
          if(str.length > dsize) {
            dcount++;
            if(dsize - 10000 > prev) {
              prev = dsize;
              debug(`${(prev/1000).toFixed()} Kb, ${dcount} docs`);
            }
          }
        }
        return sleep(1000)
          .then(() => next(bookmark));
      }
    })
    .catch(err => {
      debug(err)
    });
}
