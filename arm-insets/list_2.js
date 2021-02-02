/**
 * Список отсканированных после 20.01 изделий, обрезанный списком систем
 *
 * @module list_2
 *
 * Created by Evgeniy Malyarov on 02.02.2021.
 */

const PouchDB = require('pouchdb');
const fs = require('fs');
const list_1 = require('./list_1.json');
const {DBUSER, DBPWD} = process.env;

const syss = '49d49eff-3f0e-11e9-81fe-005056aafe4c,7bf52abd-3f23-11e9-81fe-005056aafe4c,2e8dfb9f-3f23-11e9-81fe-005056aafe4c,0611d4aa-3f16-11e9-81fe-005056aafe4c,b116a514-57a8-11e9-8200-005056aafe4c,3d586ccc-57ab-11e9-8200-005056aafe4c,8f0c9441-57a6-11e9-8200-005056aafe4c,143ab746-57aa-11e9-8200-005056aafe4c'
  .split(',');
  //.map((ref) => `cat.production_params|${ref}`);

module.exports = function list_2() {
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
      for(const ref of list_1) {
        if(keys.length < 300) {
          keys.push(`cat.characteristics|${ref}`);
        }
        else {
          const tmp = await db_doc.allDocs({include_docs: true, keys});
          for(const {doc, id} of tmp.rows) {
            doc && doc.sys && syss.includes(doc.sys) && res.add(id.split('|')[1]);
          }
          keys.length = 0;
        }
      };
      const tmp = await db_doc.allDocs({include_docs: true, keys});
      for(const {doc, id} of tmp.rows) {
        doc && doc.sys && syss.includes(doc.sys) && res.add(id.split('|')[1]);
      }
      return Array.from(res);
    })
    .then((res) => {
      fs.writeFile(`list_2.json`, JSON.stringify(res), 'utf8', (err) => err && console.log(err));
    })
};