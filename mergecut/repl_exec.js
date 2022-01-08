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

const {tasks} = require('./config');
const PouchDB = require('pouchdb');
const {clone_security} = require('./clone');
const {DBUSER, DBPWD} = process.env;

let queue = Promise.resolve();

for(const abonent in tasks) {
  for(const {src, tgt, exclude} of tasks[abonent].clone) {
    queue = queue
      .then(() => replicate({src, tgt, exclude}))
      .catch((err) => {
        console.log(err);
      });
  }
}

function replicate({src, tgt,  exclude = []}) {
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
        if(name && name[0] !== '_' && !exclude.includes(name)) {
          const sdb = new PouchDB(`${src}/${name}`, {
            auth: {
              username: DBUSER,
              password: DBPWD
            },
            skip_setup: true,
          });
          const tdb = new PouchDB(`${tgt}/${name}`, {
            auth: {
              username: DBUSER,
              password: DBPWD
            },
          });
          res.push(
            await tdb.info()
              //.then(() => tdb.destroy())
              //.catch(() => null)
              .then(() => {
                // const tdb = new PouchDB(`${tgt}/${name}`, {
                //   auth: {
                //     username: DBUSER,
                //     password: DBPWD
                //   },
                // });
                return clone_security(sdb, tdb)
                  .then(() => tdb.replicate.from(sdb, {
                    selector: {
                      $or: [
                        {
                          class_name: {$in: ['cat.characteristics', 'doc.calc_order']},
                          'timestamp.moment': {$gt: '2021-10-10'},
                          obj_delivery_state: {$ne: 'Шаблон'}
                        },
                        {
                          _id: {$regex: '_design/'}
                        }
                      ]
                    }
                  }))
                  //.then(() => sdb.destroy());
              })
          );
        }
      }
      return res;
    });
}
