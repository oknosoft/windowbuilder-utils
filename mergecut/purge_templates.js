/**
 * Удаляет старые шаблоны
 */

/**
 * ### Переменные окружения
 * DBPWD admin
 * DBUSER admin
 */


const PouchDB = require('pouchdb').plugin(require('pouchdb-find'));
const fs = require('fs');
const {DBUSER, DBPWD, SERVER} = process.env;

const templates = {

  blank: '00000000-0000-0000-0000-000000000000',
  step: 0,
  refs: require('./templates.json'),

  // база, из которой читаем цвета
  //https://dh5.oknosoft.ru:221/wb_21_doc https://dh5.oknosoft.ru:1110/wb_11_ram https://dh5.oknosoft.ru:207/wb_8_doc_0019
  db: new PouchDB(`https://dh5.oknosoft.ru:1110/wb_10_doc`, {
    auth: {
      username: DBUSER,
      password: DBPWD
    },
    skip_setup: true,
  }),

  // пополняет массив ссылок
  collect() {
    console.log(`collect templates...`);
    return this.db.find({
      selector: {
        class_name: 'doc.calc_order',
        obj_delivery_state: 'Шаблон',
        note: {$regex: '!Удаляем'},
        //limit: 1000,
      }
    })
      .then(async(res) => {
        this.step++;
        for(const doc of res.docs) {
          !this.refs.includes(doc._id) && this.refs.push(doc._id);
          for(const row of doc.production) {
            if(row.characteristic && row.characteristic !== this.blank) {
              const cx = `cat.characteristics|${row.characteristic}`;
              !this.refs.includes(cx) && this.refs.push(cx);
            }
          }
        }
        //fs.writeFile(`templates.json`, JSON.stringify(this.refs), 'utf8', (err) => err && console.log(err));
      })
      .catch(err => {
        console.log(err);
      });
  },

  // обновляет ссылки в продукции
  remove() {
    return this.db.allDocs({keys: this.refs})
      .then((res) => {
        const docs = [];
        for(const {key, value} of res.rows) {
          if(value && !value.deleted) {
            docs.push({_id: key, _rev: value.rev, _deleted: true});
          }
        }
        return this.db.bulkDocs(docs);
      })
      .then((res) => {
        console.log(res);
      });
  }
};

Promise.resolve()
  .then(() => templates.collect())
  .then(() => templates.remove())
  .then(() => {
    process.exit(0);
  });

