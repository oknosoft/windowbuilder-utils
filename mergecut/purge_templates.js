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
  db: new PouchDB(`http://${SERVER || 'localhost'}:5984/wb_21_ram`, {
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
        //note: {$regex: 'Удаляем'}
      }
    })
      .then(async(res) => {
        this.step++;
        console.log(`step:${this.step}`);
        bookmark = res.bookmark;
        for(const doc of res.docs) {
          !this.refs.includes(doc._id) && this.refs.push(doc._id);
          for(const row of doc.production) {
            if(row.characteristic && row.characteristic !== this.blank) {
              const cx = `cat.characteristics|${row.characteristic}`;
              !this.refs.includes(cx) && this.refs.push(cx);
            }
          }
        }
        //await db.bulkDocs(res.docs);
        fs.writeFile(`templates.json`, JSON.stringify(this.refs), 'utf8', (err) => err && console.log(err));
      });
  },

  // обновляет ссылки в продукции
  update(cx) {

  }
};

templates.collect().then(() => {

});

