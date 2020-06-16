/**
 * ### Модуль поиска документов с конфликтами
 *
 * @module  find_reslove_conflicts
 *
 * Created 12.06.2020
 * Собран из find_conflicts.js и resolve_conflicts.js
 * вместо перебора используем find с хорошим селектором
 * для поиска
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

const debug = require('debug')('wb:find_reslove_conflicts');
const PouchDB = require('pouchdb')
  .plugin(require('pouchdb-find'));
const http = require('http');
const request = require('request');


debug('required');

const yargs = require('yargs')
  .usage('Usage: $0 [options] <command>')
  .demand(0)
  .strict()
  .alias('d', 'database').nargs('d', 1).describe('d', 'Database name')
  .version('v', 'Show version', '0.0.1').alias('v', 'version')
  .help('h').alias('h', 'help')
  .example('node script_name -d wb_23_doc', 'Find conflicts in database wb_23_doc and reslove ')
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


var q_bookmark = "";
var conflicts_docs = 0;
var q_limit = 100;
function finder(q_bookmark) {


  return db.find({
    'selector': {
      '_conflicts': {
        '$exists': true
      }
    },
    'limit': q_limit,
    'conflicts': true,
    "bookmark": q_bookmark
  }).then(function(result) {


result.docs.forEach( async(item) => {
     return await resolve_conflicts(db, item._id);
});

    //console.log(result.docs[0]._id);
    if (result && result.docs && result.docs.length === q_limit) {
      //q_skip = q_skip + q_limit;
      conflicts_docs = conflicts_docs + result.docs.length;
      console.log("+" + result.docs.length + " Итого " + conflicts_docs);
      return finder(result.bookmark);
    } else {
      conflicts_docs = conflicts_docs + result.docs.length;
      console.log("+" + result.docs.length + " Итого " + conflicts_docs);
      return conflicts_docs;
    }
  }).catch(function(err) {
    console.log(err);
  });



}


finder().catch(function(err) {
  console.log(err);
});



function resolve_conflicts(db, id) {
  console.log(`processing ${id} started`);

  // запрашиваем документ
  return db.get(id, {
      conflicts: true
    })
    .then(res => {
      console.log(`${res._id} loaded successful`);

      // удаляем конфликтные ревизии документа
      if (res._conflicts) {
        return res._conflicts.reduce((prev, rev) => {
            return prev.then(() => {
              return db.remove(res._id, rev)
                .catch(err => {
                  console.log(`revision ${rev} cannot be remove: ${err && err.message}`);
                });
            });
          }, Promise.resolve())
          .then(() => {
            console.log(`conflicts in ${res._id} resolved successful`);
          });
      }
    })
    .catch(err => {
      console.log(`error get ${id}: ${err && err.message}`);
    });
}
