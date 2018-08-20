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

const debug = require('debug')('wb:reindex');
const PouchDB = require('./pouchdb');
const fs = require('fs');

debug('required');

// инициализируем параметры сеанса и метаданные
const {DBUSER, DBPWD, COUCHPATH, ZONE, COMPACT} = process.env;
const prefix = 'wb_';
let index = 1;

// получаем массив всех баз
new PouchDB(COUCHPATH.replace(prefix, '_all_dbs'), {
  auth: {
    username: DBUSER,
    password: DBPWD
  },
  skip_setup: true,
  ajax: {timeout: 100000}
}).info()
  .then(next);

// перебирает базы в асинхронном цикле
function next(dbs) {

  index++;
  let name = dbs[index];
  if(name && name[0] !== '_' && name.indexOf('_meta') === -1) {
    name = name.replace(`${prefix}${ZONE}_`, '');
    return reindex(name)
      .then(() => next(dbs));
  }
  else if(name) {
    return next(dbs);
  }
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