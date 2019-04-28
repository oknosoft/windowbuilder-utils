/**
 * Пересчитывает индексы и выполняет сжатие
 *
 * @module reindexer
 *
 * Created by Evgeniy Malyarov on 04.07.2018.
 */

/**
 * ### Переменные окружения
 * DBPWD admin
 * DBUSER admin
 * IGN_ROOT :76/,:177/
 */

'use strict';

require('http').globalAgent.maxSockets = 35;

const PouchDB = require('../pouchdb').plugin(require('pouchdb-find'));
const fetch = require('node-fetch');
const log_err = require('./log_err');

// инициализируем параметры сеанса и метаданные
const {DBUSER, DBPWD, IGN_ROOT} = process.env;

// если в адресе сервера есть эти порты, индексы в корневой базе не пересчитываем
const ign_root = IGN_ROOT ? IGN_ROOT.split(',') : [];

const auth = {
  credentials: 'include',
  headers: {
    Authorization: `Basic ${Buffer.from(DBUSER + ":" + DBPWD).toString('base64')}`,
    'Content-Type': 'application/json',
  },
};

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

function sleep(time, res) {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(res), time);
  });
}

function opts(opts) {
  return Object.assign({}, auth, opts);
}

function compact(db) {
  return new Promise((resolve, reject) => {

    const check = () => {
      db.info()
        .then((info) => {
          if(info.compact_running) {
            setTimeout(check, 20000);
          }
          else {
            fetch(`${db.name}/_view_cleanup`, opts({method: 'POST'}))
              .then(() => sleep(1000))
              .then(() => resolve());
          }
        })
        .catch(reject);
    };

    fetch(`${db.name}/_compact`, opts({method: 'POST'}))
      .then((res) => setTimeout(check, 6000));
  });
}

function revs_limit(name, count) {
  return fetch(`${name}/_revs_limit`, opts({
    method: 'PUT',
    body: count,
  }))
    .then((res) => res.json());
}

function rebuild_indexes(db) {
  let promises = Promise.resolve();
  if(db.name.endsWith('_doc') && ign_root.some((port) => db.name.includes(port))) {
    return promises;
  }
  return db.allDocs({
      include_docs: true,
      startkey: '_design/',
      endkey : '_design/\u0fff',
      limit: 1000,
    })
      .then(({rows}) => {
        for(const {doc} of rows) {
          if(doc.views) {
            for(const name in doc.views) {
              const view = doc.views[name];
              const index = doc._id.replace('_design/', '') + '/' + name;
              if(doc.language === 'javascript') {
                promises = promises
                  .then(() => db.query(index, {limit: 1}).catch(() => null));
              }
              else {
                const selector = {
                  //use_index: index,
                  limit: 1,
                  fields: ['_id'],
                  selector: {},
                  use_index: index.split('/'),
                };
                for(const fld of view.options.def.fields) {
                  selector.selector[fld] = '';
                }
                promises = promises
                  .then(() => db.find(selector).catch(() => null));
              }
            }
            if(doc.language === 'javascript') {
              promises = promises
                .then(() => fetch(`${db.name}/${doc._id.replace('_design', '_compact')}`, opts({method: 'POST'})));
            }
          }
        }
        return promises;
      })
    .then(() => sleep(3000));
}

function reindex(name) {
  // получаем базы
  const db = new PouchDB(name, {
    auth: {
      username: DBUSER,
      password: DBPWD
    },
    skip_setup: true,
    ajax: {timeout: 100000}
  });

  log_err({log: true, reindex: name});
  return db.info()
    .then((info) => {
      if(!info.compact_running) {
        return revs_limit(name, name.endsWith('ram') ? 3 : 5)
          .then(() => rebuild_indexes(db))
          .then(() => compact(db))
      }
    })
    .catch(log_err);
}