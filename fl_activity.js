/**
 * Добавляет ddoc _design/activity
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
 * COUCHPATH http://fl211:5984
 */

'use strict';

require('http').globalAgent.maxSockets = 35;

const debug = require('debug')('wb:reindex');
const PouchDB = require('./pouchdb');
const fs = require('fs');
const activity = require('./files/activity');

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

  return db.get('_design/activity')
    .catch((err) => {
      if(err.status !== 404) {
        return err;
      }
    })
    .then((doc) => {
      if(!doc) {
        return db.put(activity)
      }
    })
    .catch((err) => {
      debug(`${name}: ${err.error}, ${err.reason}`);
    });
}