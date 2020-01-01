/**
 *
 *
 * @module repl_stop
 *
 * Created by Evgeniy Malyarov on 01.01.2020.
 */

const PouchDB = require('../pouchdb');
const {tasks} = require('./config');
const {DBUSER, DBPWD} = process.env;

let queue = Promise.resolve();

for(const abonent in tasks) {
  const {dbs, test} = tasks[abonent];
  for(const name of dbs) {
    queue = queue.then(() => {
      const db = new PouchDB(`${name}/_replicator`, {
        auth: {
          username: DBUSER,
          password: DBPWD
        },
        skip_setup: true,
      });
      return db.allDocs({include_docs: true, limit: 1000})
        .then(({rows}) => {
          let rm = Promise.resolve();
          for(const {doc} of rows) {
            if(doc.continuous && test.test(doc.target) && test.test(doc.source)) {
              rm = rm.then(() => db.remove(doc));
            }
          }
          return rm;
        })
    });
  }
  queue = queue.catch((err) => {
    console.log(err);
  });
}


