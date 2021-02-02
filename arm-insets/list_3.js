/**
 * Список отсканированных после 20.01 изделий, обрезанный списком систем, обрезанный отсутствием армирования
 *
 * @module list_3
 *
 * Created by Evgeniy Malyarov on 03.02.2021.
 */

const PouchDB = require('pouchdb');
const fs = require('fs');
const list_2 = require('./list_2.json');
const {DBUSER, DBPWD} = process.env;

const arms = '3e6a62e8-3c40-11e9-81fe-005056aafe4c,2529438c-3c40-11e9-81fe-005056aafe4c,cbd9f1e5-04af-11eb-8211-005056aafe4c,d8ffeb61-3c40-11e9-81fe-005056aafe4c,7ae666be-3c40-11e9-81fe-005056aafe4c,a56ece22-3c40-11e9-81fe-005056aafe4c,64ac0b27-04b0-11eb-8211-005056aafe4c,8d3f7559-3c42-11e9-81fe-005056aafe4c,f487b919-b05d-11ea-820a-005056aafe4c,9533cac3-04b4-11eb-8211-005056aafe4c'
  .split(',');
//.map((ref) => `cat.production_params|${ref}`);

module.exports = function list_3() {
  const db_doc = new PouchDB(`https://dh5.oknosoft.ru:221/wb_21_doc/`, {
    auth: {
      username: DBUSER,
      password: DBPWD
    },
    skip_setup: true,
  });
  return db_doc.info()
    .then(async (info) => {
      const keys = [];
      const res = new Set();
      for(const ref of list_2) {
        if(keys.length < 200) {
          keys.push(`cat.characteristics|${ref}`);
        }
        else {
          const tmp = await db_doc.allDocs({include_docs: true, keys});
          for(const {doc} of tmp.rows) {
            if(doc && doc.specification) {
              if(doc.specification.some((row) => arms.includes(row.nom))) {
                continue;
              }
              res.add(doc);
            }
          }
          keys.length = 0;
        }
      };
      const tmp = await db_doc.allDocs({include_docs: true, keys});
      for(const {doc} of tmp.rows) {
        if(doc && doc.specification) {
          if(doc.specification.some((row) => arms.includes(row.nom))) {
            continue;
          }
          res.add(doc);
        }
      }
      return Array.from(res);
    })
    .then((res) => {
      const detales = [];
      let length = 0
      for(const doc of res) {
        const tmp = {
          ref: doc._id.split('|')[1],
          sys: doc.sys,
          length: 0
        };
        detales.push(tmp);
        for(const row of doc.coordinates) {
          if('Рама,Створка,Импост'.includes(row.elm_type)) {
            length += row.len;
            tmp.length += row.len;
          }
        }
      }
      fs.writeFile(`list_3.json`, JSON.stringify({detales, length}), 'utf8', (err) => err && console.log(err));
    })
};