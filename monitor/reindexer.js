/**
 * Пересчитывает индексы и выполняет сжатие
 *
 * @module reindexer
 *
 * Created by Evgeniy Malyarov on 04.07.2018.
 */

/**
 * ### Переменные окружения
 * DEBUG "wb:*,-not_this"
 * ZONE 21
 * DBPWD admin
 * DBUSER admin
 * COUCHPATH http://cou221:5984/wb_
 * COMPACT 1
 */

'use strict';

require('http').globalAgent.maxSockets = 35;

const PouchDB = require('../pouchdb');

// инициализируем параметры сеанса и метаданные
const {DBUSER, DBPWD} = process.env;

module.exports = function (url) {

  let index = 1;

  // перебирает базы в асинхронном цикле
  function next(dbs) {
    index++;
    let name = dbs[index];
    if(name && name[0] !== '_') {
      return reindex(`${url}/${name}`)
        .then(() => next(dbs));
    }
    else if(name) {
      return next(dbs);
    }
  }

  // получаем массив всех баз
  return new PouchDB(`${url}/_all_dbs`, {
    auth: {
      username: DBUSER,
      password: DBPWD
    },
    skip_setup: true,
    ajax: {timeout: 100000}
  }).info()
    .then(next);
}


function reindex(name) {
  // получаем базы
  const db = new PouchDB(`${COUCHPATH}${ZONE}_${name}`, {
    auth: {
      username: DBUSER,
      password: DBPWD
    },
    skip_setup: true,
    ajax: {timeout: 100000}
  });

  return db.info()
    .then((info) => {
      debug(`${name}: ${info.doc_count}`);
    })
    .catch((err) => {
      debug(err);
    });
}