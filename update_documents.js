/**
 * ### Модуль перезаписи документов
 *
 * @module  update_documents
 *
 * Created 14.01.2019
 */

/**
 * ### Переменные окружения
 * DEBUG "wb:*,-not_this"
 * ZONE 21
 * DBUSER admin
 * DBPWD admin
 * COUCHPATH http://cou221:5984/wb_
 */

'use strict';

const debug = require('debug')('wb:update_documents');
const PouchDB = require('./pouchdb')
  .plugin(require('pouchdb-find'));
const fs = require('fs');

debug('required');

const yargs = require('yargs')
  .usage('Usage: $0 [options] <command>')
  .demand(1)
  .strict()
  .alias('d', 'database').nargs('d', 1).describe('d', 'Database name')
  .version('v', 'Show version', '0.0.1').alias('v', 'version')
  .help('h').alias('h', 'help')
  .example('node update_document id cat.characteristics|00000000-0000-0000-0000-000000000000', 'Update document with id `cat.characteristics|00000000-0000-0000-0000-000000000000`, database by default wb_21_doc')
  .example('node update_document json_file file.json', 'Update documents from JSON file `file.json` in database wb_21_doc')
  .command(
    'id [name]',
    'Update document id `name`',
    yargs => yargs.positional('name', {type: 'string', describe: 'Empty document id'}),
    args => {
      const { d, name } = args;
      if (name) {

        // инициализируем параметры сеанса и метаданные
        const {ZONE, DBUSER, DBPWD, COUCHPATH} = process.env;
        const prefix = 'wb_';

        const path = d ? `${COUCHPATH.replace(prefix, '')}${d}` : `${COUCHPATH}${ZONE}_doc`;

        const db = new PouchDB(path, {
          auth: {
            username: DBUSER,
            password: DBPWD
          },
          skip_setup: true,
          ajax: {timeout: 100000}
        });

        db.info()
          .then(info => {
            console.log(`connected to ${info.host}, doc count: ${info.doc_count}`);
          })
          .then(() => update_document(db, name))
          .then(() => {
            console.log('all done');
          })
          .catch(err => {
            console.log(`error find ${name}: ${err && err.message}`);
          });
      }
      else {
        yargs.showHelp();
        process.exit(1);
      }
    }
  )
  .command(
    'json_file [name]',
    'Update documents from JSON file `name`',
    yargs => yargs.positional('name', {type: 'string', describe: 'Empty JSON file name'}),
    args => {
      const { d, name } = args;
      if (name) {

        // инициализируем параметры сеанса и метаданные
        const {ZONE, DBUSER, DBPWD, COUCHPATH} = process.env;
        const prefix = 'wb_';

        const path = d ? `${COUCHPATH.replace(prefix, '')}${d}` : `${COUCHPATH}${ZONE}_doc`;

        const db = new PouchDB(path, {
          auth: {
            username: DBUSER,
            password: DBPWD
          },
          skip_setup: true,
          ajax: {timeout: 100000}
        });

        db.info()
          .then(info => {
            console.log(`connected to ${info.host}, doc count: ${info.doc_count}`);
          })
          .then(() => {
            return new Promise((resolve, reject) => {
              fs.readFile(name, {encoding: 'utf-8'}, (err, data) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(data);
                }
              });
            })
              .then(data => {
                const json = JSON.parse(data);
                if (!json) {
                  throw new Error({
                    error: true,
                    message: 'bad JSON format'
                  });
                }

                return update_documents(db, json);
              });
          })
          .then(() => {
            console.log('all done');
          })
          .catch(err => {
            console.log(`error update from ${name}: ${err && err.message}`);
          });
      }
      else {
        yargs.showHelp();
        process.exit(1);
      }
    }
  )
  .epilog('\nMore information about the library: https://github.com/oknosoft/windowbuilder');

const {argv} = yargs;
if (!argv._.length) {
  yargs.showHelp();
  process.exit(1);
}

async function update_documents(db, json) {
  if (json.items && typeof json.items === 'object') {
    for (const field in json.items) {
      if (json.items[field] instanceof Array) {
        for (const item of json.items[field]) {
          if (typeof item === 'object' && item.ref) {
            await update_document(db, `${field}|${item.ref}`);
          }
        }
      }
    }
  }
}

function update_document(db, id) {
  console.log(`processing ${id} started`);

  // запрашиваем документ
  return db.get(id)
    .then(doc => {
      console.log(`${doc._id} loaded successful`);

      // обновляем документ
      return db.put(doc)
        .then(() => {
          console.log(`${doc._id} updated successful`);
        })
        .catch(err => {
          console.log(`error update ${doc._id}: ${err && err.message}`);
        });
    })
    .then(() => {
      console.log(`${id} updated successful`);
    })
    .catch(err => {
      console.log(`error get ${id}: ${err && err.message}`);
    });
}
