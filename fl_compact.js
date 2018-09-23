/**
 * Обслуживание баз flowcon
 *
 * @module fl_compact
 *
 * Created by Evgeniy Malyarov on 04.07.2018.
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
const PouchDB = require('./pouchdb').plugin({exec});
const fs = require('fs');

debug('required');

// инициализируем параметры сеанса и метаданные
const {DBUSER, DBPWD, COUCHPATH} = process.env;
const prefix = 'fl_';
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
  if(name && name.startsWith(prefix)) {
    return reindex(name)
      .then(() => next(dbs));
  }
  else if(name) {
    return next(dbs);
  }
}

function exec(method, path, form) {

  return new Promise((resolve, reject) => {
    this._ajax({
      url: `${this.name}/${path}`,
      auth: {
        username: DBUSER,
        password: DBPWD
      },
      method,
      form,
    }, (err, obj, resp) => {
      debug(`${this.name.replace(/^(.*\/)/, '')}/${path}: ${JSON.stringify(err || obj)}`);
      setTimeout(resolve, 2000);
    });
  });
}

function reindex(name) {

  const db = new PouchDB(`${COUCHPATH}/${name}`, {
    auth: {
      username: DBUSER,
      password: DBPWD
    },
    skip_setup: true
  });

  return db.exec('PUT', '_revs_limit', '3')
    .then(() => db.exec('POST', '_compact', ''))
    .then(() => db.exec('POST', '_view_cleanup', ''))
    .then(() => db.close());
}