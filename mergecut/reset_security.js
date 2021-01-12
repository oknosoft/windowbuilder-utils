/**
 * Сбрасывает _security к типовым настройкам
 *
 */

/**
 * ### Переменные окружения
 * DEBUG "wb:*,-not_this"
 * DBPWD admin
 * DBUSER admin
 */

const {tasks} = require('./config');
const PouchDB = require('pouchdb');
const fetch = require('node-fetch');
const {DBUSER, DBPWD} = process.env;

let queue = Promise.resolve();

for(const abonent in tasks) {
  for(const {src, exclude} of tasks[abonent].clone) {
    queue = queue
      .then(() => execute({src, test: tasks[abonent].test, exclude}))
      .catch((err) => {
        console.log(err);
      });
  }
}

function execute({src, test,  exclude = []}) {
  // получаем массив всех баз
  return new PouchDB(`${src}/_all_dbs`, {
    auth: {
      username: DBUSER,
      password: DBPWD
    },
    skip_setup: true,
  }).info()
    .then(async (dbs) => {
      for(const name of dbs) {
        if(name && test.test(name) && !exclude.includes(name)) {
          await fetch(`${src}/${name}/_security`, {
            method: 'PUT',
            credentials: 'include',
            headers: {Authorization: `Basic ${Buffer.from(DBUSER + ":" + DBPWD).toString('base64')}`},
            body: '{"admins":{"names":["eco_couchdb_robot"],"roles":["doc_full"]},"members":{"names":[],"roles":["doc_reader","doc_editor"]}}',
          });
        }
      }
    });
}
