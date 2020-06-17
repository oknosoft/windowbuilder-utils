/**
 * ### Модуль поиска и прочистки Удаленны документов
 *
 * @module  purge_db
 *
 * Created 11.06.2020
 * поиск в _canges Базы удалённых документов
 * и прочистка полностью удалённых документов
 */

/**
 * ### Переменные окружения
 * DEBUG "wb:*,-not_this"
 * ZONE 23
 * DBUSER admin
 * DBPWD admin
 * COUCHPATH http://cou223:5984/wb_
 */

'use strict';

const debug = require('debug')('wb:purge_db');
const PouchDB = require('pouchdb')
  .plugin(require('pouchdb-find'));

const request = require('request');


debug('required');

const yargs = require('yargs')
  .usage('Usage: $0 [options] <command>')
  .demand(0)
  .strict()
  .alias('d', 'database').nargs('d', 1).describe('d', 'Database name')
  .version('v', 'Show version', '0.0.1').alias('v', 'version')
  .help('h').alias('h', 'help')
  .example('node purge_db -d wb_23_doc', 'purge deleted docs in database wb_23_doc')
  .epilog('\nMore information about the library: https://github.com/oknosoft/windowbuilder');

const {
  argv: {
    database
  }
} = yargs;

// инициализируем параметры сеанса и метаданные
const {
  ZONE,
  DBUSER,
  DBPWD,
  COUCHPATH
} = process.env;
const prefix = 'wb_';

var auth = "Basic " + new Buffer.from(DBUSER + ":" + DBPWD).toString("base64");

const path = database ? `${COUCHPATH.replace(prefix, '')}${database}` : `${COUCHPATH}${ZONE}_doc`;

const db = new PouchDB(path, {
  auth: {
    username: DBUSER,
    password: DBPWD
  },
  skip_setup: true,
  ajax: {
    timeout: 100000
  }
});



var processed_docs = 0,
  conflicts_docs = 0;

//var db = $p.adapters.pouch.remote.doc
var pageSize = 10;
var lastSeq = 0;




function find_purge(item) {
  // Есть проблеммы если документ был Удалён а после создан
  // надо проверить есть ли он на самом деле
  return db.get(item)
    .catch(async (err) => {
      let rs = {};
      rs[item.id] = [item.changes[0].rev];
      return await request.post(`${path}/_purge`, {
        json: rs,
        headers: {
          "Authorization": auth
        }
      }, (error) => {
        if (error) {
          console.error(error);
        }
      });
    });
}

function fetchNextPage() {

  return db.changes({
    since: lastSeq,
    limit: pageSize,
    selector: {
      "_deleted": true
    }
  }).then(function(changes) {
    if (changes.results.length < pageSize) {
      console.log(changes.last_seq);
      changes.results.forEach(async (item) => {

        await find_purge(item);

      });

    } else {
      changes.results.forEach(async (item) => {

        //console.log(item);
        await find_purge(item);

      });

      lastSeq = changes.last_seq;
      return fetchNextPage();
    }
  });
}

fetchNextPage().catch(function(err) {
  console.log(err);
});
