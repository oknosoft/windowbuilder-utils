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
 */

'use strict';

require('http').globalAgent.maxSockets = 35;

const debug = require('debug')('wb:stream');
const JSZip = require('jszip');
const PouchDB = require('./pouchdb');
const MemoryStream = require('memorystream');
const repStream = require('pouchdb-replication-stream');

// register pouch-replication-stream as a plugin
PouchDB.plugin(repStream.plugin);
PouchDB.adapter('writableStream', repStream.adapters.writableStream);

debug('required');

// инициализируем параметры сеанса и метаданные
const {DBUSER, DBPWD, COUCHPATH, ZONE} = process.env;
const prefix = 'wb_';
let index = 1;

// получаем массим всех баз
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
  if(name && name.indexOf(`${prefix}${ZONE}_`) !== -1) {
    name = name.replace(`${prefix}${ZONE}_`, '')
    return ddump(name)
      .then(() => next(dbs));
  }
  else if(name) {
    return next(dbs);
  }
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
      const stream = new MemoryStream();
      stream.on('data', (chunk) => {
        dumpedString += chunk.toString();
      });

      // базы doc архивируем с фильтром 'auth/push_only'
      const opt = {batch_size: 200};
      if(name !== 'ram') {
        opt.filter = 'auth/push_only';
      }
      return src.dump(stream, opt)
        .then(() => {
          debug(`dumped size: ${(dumpedString.length/1000000).toFixed(3)}Mb`);
          // создаём виртуальный файл в JSZip
          const zip = new JSZip();
          zip.file('dump', dumpedString);
          dumpedString = '';
          // сжимаем
          return zip.generateAsync({
            type: 'base64',
            compression: 'DEFLATE',
            compressionOptions: {
              level: 9
            }
          });
        })
    })
    .then((dump) => {
      // записываем дамп в '_local/dump'
      debug(`gzipped string: ${(dump.length/1000000).toFixed(3)}Mb`);
      return db.get('_local/dump')
        .catch(() => ({_id: '_local/dump'}))
        .then((doc) => {
          doc.dump = dump;
          debug(`saving _local/dump`);
          return db.put(doc)
        })
    })
    .then(() => debug(`${name}: ok ==========`))
    .catch((err) => {
      debug(err);
    });

}
