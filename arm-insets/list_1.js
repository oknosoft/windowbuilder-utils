/**
 * Список отсканированных после 20.01 изделий
 *
 * @module list_1
 *
 * Created by Evgeniy Malyarov on 02.02.2021.
 */

const PouchDB = require('pouchdb');
const fs = require('fs');
const {DBUSER, DBPWD} = process.env;

module.exports = function list_1() {
  const db_events = new PouchDB(`http://oknosoft.ecookna.ru:5984/pl_events/`, {
    auth: {
      username: DBUSER,
      password: DBPWD
    },
    skip_setup: true,
  });
  return db_events.info()
    .then((res) => {
      return db_events.allDocs({start_key: '20210120', end_key: '20210220'});
    })
    .then(async ({rows}) => {
      const ids = new Set();
      for(const {id} of rows) {
        const bar = id.split('|')[1];
        bar && ids.add(bar);
      }
      const keys = [];
      const res = new Set();
      for(const id of ids) {
        if(keys.length < 1000) {
          keys.push(`bar|${id}`);
        }
        else {
          const tmp = await db_events.allDocs({include_docs: true, keys});
          for(const {doc} of tmp.rows) {
            doc && doc.characteristic && res.add(doc.characteristic);
          }
          keys.length = 0;
        }
      };
      return Array.from(res);
    })
    .then((res) => {
      fs.writeFile(`list_1.json`, JSON.stringify(res), 'utf8', (err) => err && console.log(err));
    })
};