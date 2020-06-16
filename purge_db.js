/**
 * ### Модуль поиска документов с конфликтами
 *
 * @module  find_conflicts
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

const debug = require('debug')('wb:find_conflicts');
const PouchDB = require('pouchdb')
  .plugin(require('pouchdb-find'));

const request = require('request')


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

function fetchNextPage() {

// Задейсствовать фильтр только для Удалённых
// https://docs.couchdb.org/en/stable/api/database/changes.html
// Что Ускорит прочистку

  return db.changes({
    since: lastSeq,
    limit: pageSize
  }).then(function(changes) {
    if (changes.results.length < pageSize) {
      // done! 
    } else {
      changes.results.forEach(async (item) => {
        if (item.deleted) {


          console.log(item.id);
// Есть проблеммы если документ был Удалён а после создан
// надо проверить есть ли он на самом деле
          await db.get(item.id)
            .catch((err) => {

              console.log(err);
              //console.log(db);

              let rs = {};
              rs[item.id] = [item.changes[0].rev];
              request.post(`${path}/_purge`, {
                json: rs,
                headers: {
                  "Authorization": auth
                }
              }, (error, res, body) => {
                if (error) {
                  console.error(error);
                  return;
                }
                console.log(`statusCode: ${res.statusCode}`);
                console.log(body);
              });


            });


        }
      });


      lastSeq = changes.last_seq;

      return fetchNextPage();
    }
  });
}

fetchNextPage().catch(function(err) {
  console.log(err);
});
