/**
 * Следит за репликациями, при необходимости перезапускает
 *
 * @module repl_monitor
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
 * CONTINUES 1
 */

'use strict';

require('http').globalAgent.maxSockets = 35;

const debug = require('debug')('wb:repl');
const PouchDB = require('./pouchdb');
const fs = require('fs');

debug('required');

// инициализируем параметры сеанса и метаданные
const {DBUSER, DBPWD, COUCHPATH, ZONE, CONTINUES} = process.env;
const prefix = 'wb_';

// получаем массив всех репликаций
const repl_db = new PouchDB(COUCHPATH.replace(prefix, '_replicator'), {
  auth: {
    username: DBUSER,
    password: DBPWD
  },
  skip_setup: true,
  ajax: {timeout: 100000}
});

let runing;

restart_stopped();

function restart_stopped() {

  // если задача запущена, откладываем действия на 10 минут
  if(runing) {
    return setTimeout(restart_stopped, 300000);
  }
  runing = true;

  repl_db.allDocs({include_docs: true})
    .then(({rows}) => {
      return new PouchDB(COUCHPATH.replace(prefix, '_active_tasks'), {
        auth: {
          username: DBUSER,
          password: DBPWD
        },
        skip_setup: true,
        ajax: {timeout: 100000}
      })
        .info()
        .then((tasks) => {
          const res = [];
          for(const row of rows) {
            if(row.id[0] === '_') {
              continue;
            }
            for(const task of tasks) {
              if(task.doc_id === row.id) {
                row.doc.task = task;
                delete task.doc_id;
                tasks.splice(tasks.indexOf(task), 1)
                break;
              }
            }
            res.push(row.doc);
          }
          return res;
        });
    })
    .then((res) => {
      const rows = [];
      for(const info of res) {
        if(info.continuous && !info.task) {
          // надо перезапустить
          rows.push(info);
        }
      }
      debug(`finded ${rows.length} problem rows`);
      return next(rows)
    })
    .catch((err) => {
      debug(err);
    })
    .then(() => {
      if(CONTINUES) {
        runing = false;
        return setTimeout(restart_stopped, 300000);
      }
    });
}

// перебирает задачи в асинхронном цикле
function next(rows) {
  if(rows.length) {
    const [info] = rows.splice(0, 1);
    return restart(info)
      .then(() => next(rows));
  }
  return Promise.resolve();
}

function sleep(time, res) {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(res), time);
  });
}

function restart(info) {

  // останавливаем репликацию
  return repl_db.get(info._id)
    .catch(() => ({_id: info._id}))
    .then((doc) => {
      debug(`stop ${doc._id}`);
      return repl_db.remove(doc._id, doc._rev);
    })
    // ждём
    .then(() => sleep(10000))
    // запускаем репликацию
    .then(() => {
      const repl = {
        _id: info._id,
        continuous: info.continuous,
        create_target : info.continuous,
        owner: info.owner,
        selector: info.selector,
        source: info.source,
        target: info.target,
      }
      debug(`run ${doc._id}`);
      return repl_db.put(repl);
    })
    // продолжаем через 2 минуты
    .then(() => sleep(120000))
    // если возникли ошибки и это первый restart - перезапускаем
    .catch((err) => {
      debug(err);
      if(!info.restart) {
        info.restart = 1;
        return sleep(10000, restart(info));
      }
    });
}