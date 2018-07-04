/**
 * ### Модуль создания начальных образов баз Заказа дилера для быстрой стратовой синхронизации
 *
 * Created 24.02.2018
 */

/**
 * ### Переменные окружения
 * DEBUG "wb:*,-not_this"
 * ZONE 21
 * DBPWD admin
 * DBUSER admin
 * COUCHPATH http://cou221:5984/wb_
 * TO_FILE 1
 */

'use strict';

require('http').globalAgent.maxSockets = 35;

const debug = require('debug')('wb:stream');
const JSZip = require('jszip');
const PouchDB = require('./pouchdb');
const MemoryStream = require('memorystream');
const repStream = require('pouchdb-replication-stream');
const fs = require('fs');

// register pouch-replication-stream as a plugin
PouchDB.plugin(repStream.plugin);
PouchDB.adapter('writableStream', repStream.adapters.writableStream);

debug('required');

// инициализируем параметры сеанса и метаданные
const {DBUSER, DBPWD, COUCHPATH, ZONE, TO_FILE} = process.env;
const prefix = 'wb_';
let index = -1;

// получаем массив всех баз
// new PouchDB(COUCHPATH.replace(prefix, '_all_dbs'), {
//   auth: {
//     username: DBUSER,
//     password: DBPWD
//   },
//   skip_setup: true,
//   ajax: {timeout: 100000}
// }).info()
//   .then(next);

next(['wb_21_ram', 'wb_21_templates']);

// перебирает базы в асинхронном цикле
function next(dbs) {

  index++;
  let name = dbs[index];
  if(name && name.indexOf(`${prefix}${ZONE}_`) !== -1 && name.match(/(_ram|_templates)$/)) {
    name = name.replace(`${prefix}${ZONE}_`, '');
    return ddump(name)
      .then(() => next(dbs));
  }
  else if(name) {
    return remove(name)
      .then(() => next(dbs));
  }
}

function remove(name) {
  // получаем базы
  const db = new PouchDB(`${COUCHPATH.replace(prefix, '')}${name}`, {
    auth: {
      username: DBUSER,
      password: DBPWD
    },
    skip_setup: true,
    ajax: {timeout: 100000}
  });

  return db.info()
    .then((info) => {
      return db.get('_local/dump')
        .then((doc) => db.remove('_local/dump', doc._rev));
    })
    .catch((err) => {
      debug(err);
    });
}

// выполняет дамп конкретной базы
function ddump(name) {

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
      if(info.doc_count > 100) {
        debug(`connected to ${info.host}, doc count: ${info.doc_count}`);
        return db;
      }
      throw `empty db ${name}`;
    })
    .then((src) => {

      // в dumpedString будем накапливать строку потоковой репликации
      let dumpedString = '';
      let ind = 0;
      let doc_count = 0;
      const stream = new MemoryStream();
      stream.on('data', (chunk) => {
        const data = chunk.toString();
        dumpedString += data;
        if(TO_FILE && data.length < 3000) {
          ind++;
          let suffix = ind.toString();
          while (suffix.length < 5) {
            suffix = '0' + suffix;
          }
          if(ind === 1) {
            const info = JSON.parse(data);
            doc_count = info.db_info.doc_count;
          }
          fs.writeFile(`${name}/${suffix}.json`, dumpedString, 'utf8', (err) => {
            if (err) {
              debug(err);
              process.exit(1);
            } else {
              debug(`Записан ${suffix}.json`);
            }
          });
          dumpedString = '';
        }
      });

      // базы doc архивируем с фильтром 'auth/push_only'
      const opt = {batch_size: 300};

      return src.dump(stream, opt)
        .then(() => {
          if(TO_FILE) {
            fs.writeFile(`${name}/00000.json`, JSON.stringify({files: ind, stamp: Date.now(), doc_count}), 'utf8', (err) => {
              if (err) {
                debug(err);
                process.exit(1);
              } else {
                debug(`Записан 0000.json`);
              }
            });
            return '';
          }
          else {
            debug(`dumped size: ${(dumpedString.length/1000000).toFixed(3)}Mb`);
            // создаём виртуальный файл в JSZip
            const zip = new JSZip();
            zip.file('dump', dumpedString);
            dumpedString = '';
            // сжимаем
            return zip.generateAsync({
              type: 'base64',
              compression: 'DEFLATE',
              compressionOptions: {level: 9}
            });
          }
        })
    })
    .then((dump) => {
      // записываем дамп в '_local/dump' или удаляем dump
      debug(`gzipped string: ${(dump.length/1000000).toFixed(3)}Mb`);
      return db.get('_local/dump')
        .catch(() => ({_id: '_local/dump'}))
        .then((doc) => {
          if(dump.length) {
            doc.dump = dump;
            debug(`saving _local/dump`);
            return db.put(doc);
          }
          else if(doc._rev) {
            debug(`deleting _local/dump`);
            return db.remove('_local/dump', doc._rev);
          }
        });
    })
    .then(() => debug(`${name}: ok ==========`))
    .catch((err) => {
      debug(err);
    });

}
