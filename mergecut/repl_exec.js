/**
 * Реплицирует все базы источника в приёмник
 * попутно, устанавливает _security
 *
 * @module index
 *
 * Created by Evgeniy Malyarov on 31.12.2019.
 */

/**
 * ### Переменные окружения
 * DEBUG "wb:*,-not_this"
 * DBPWD admin
 * DBUSER admin
 */

const {tasks, start, life, security} = require('./config');
const PouchDB = require('pouchdb');
const {clone_security, sleep} = require('./clone');
const {DBUSER, DBPWD} = process.env;

let queue;

function replicate({src, tgt, exclude  = [], test, clear = {}}) {
  // получаем массив всех баз
  return new PouchDB(`${src}/_all_dbs`, {
    auth: {
      username: DBUSER,
      password: DBPWD
    },
    skip_setup: true,
  }).info()
    .then(async (dbs) => {
      const res = [];
      for(const name of dbs) {
        if(name && name[0] !== '_' && !exclude.includes(name) && (!test || test.test(name))) {
          const sdb = new PouchDB(`${src}/${name}`, {
            auth: {
              username: DBUSER,
              password: DBPWD
            },
            skip_setup: true,
          });
          let tdb = new PouchDB(`${tgt}/${name}`, {
            auth: {
              username: DBUSER,
              password: DBPWD
            },
          });
          res.push(
            await tdb.info()
              .then(() => {
                return clear.tgt ? tdb.destroy().catch(() => null) : null;
              })
              .then(() => {
                if(clear.tgt) {
                  tdb = new PouchDB(`${tgt}/${name}`, {
                    auth: {
                      username: DBUSER,
                      password: DBPWD
                    },
                  });
                }
                return (security === false ? Promise.resolve() : clone_security(sdb, tdb))
                  .then(() => tdb.replicate.from(sdb, {
                    selector: {
                      $or: [
                        {
                          class_name: {$in: ['cat.characteristics', 'doc.calc_order']},
                          'timestamp.moment': {$gt: start},
                          obj_delivery_state: {$ne: 'Шаблон'}
                        },
                        {
                          _id: {$regex: '_design/'}
                        }
                      ]
                    }
                  }))
                  .catch(err => err);
              })
              .then((res) => {
                if(res instanceof Error) {
                  console.error(res);
                }
                else if(res.docs_read || res.docs_written) {
                  res.source = sdb.name;
                  res.target = tdb.name;
                  console.log(JSON.stringify(res, null, '\t'));
                }                 
                return sleep(200, clear.src ? sdb.destroy() : null);
              })
          );
        }
      }
      return res;
    });
}

function execute() {
  queue = Promise.resolve();
  for(const abonent in tasks) {
    const {clone, ...other} = tasks[abonent];
    for(const {src, tgt} of clone) {
      queue = queue
          .then(() => replicate({src, tgt, ...other}))
          .catch((err) => {
            console.error(err);
          })
          .then(() => sleep(600));
    }
  }
  if(life) {
    queue = queue.then(() => setTimeout(execute, life));
  }
}

execute();
