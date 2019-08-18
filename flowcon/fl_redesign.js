/**
 * Исправляет ошибку _design/search -> _design/mango
 *
 * @module fl_redesign
 *
 * Created by Evgeniy Malyarov on 23.09.2018.
 */

/**
 * ### Переменные окружения
 * DEBUG "wb:*,-not_this"
 * DBPWD admin
 * DBUSER admin
 * COUCHPATH http://cou221:5984/wb_
 */

'use strict';

require('http').globalAgent.maxSockets = 35;

const debug = require('debug')('wb:reindex');
const PouchDB = require('../pouchdb');
const fs = require('fs');

debug('required');

// инициализируем параметры сеанса и метаданные
const {DBUSER, DBPWD, COUCHPATH} = process.env;
const prefix = 'wb_';
let index = 1;

// получаем массив всех баз
new PouchDB(`${COUCHPATH}/_all_dbs`, {
  auth: {
    username: DBUSER,
    password: DBPWD
  },
  skip_setup: true
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
  const db = new PouchDB(`${COUCHPATH}/${name}`, {
    auth: {
      username: DBUSER,
      password: DBPWD
    },
    skip_setup: true
  });

  return db.get('_design/search')
    .then((doc) => {
      doc._id = '_design/mango';
      const _rev = doc._rev;
      delete doc._rev;
      return db.put(doc)
        .then(() => {
          debug(`${name}: ok`);
          return db.remove('_design/search', _rev);
        });
    })
    .catch((err) => {
      debug(`${name}: ${err.error}, ${err.reason}`);
    });
}