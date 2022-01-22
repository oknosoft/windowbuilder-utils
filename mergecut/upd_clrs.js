/**
 * Переводит ссылки составных цветоы в новый формат
 */

/**
 * ### Переменные окружения
 * DBPWD admin
 * DBUSER admin
 */


const PouchDB = require('pouchdb').plugin(require('pouchdb-find'));
const {DBUSER, DBPWD, SERVER} = process.env;

const clrs = {
  simple: {},
  composite: {},
  blank: '00000000-0000-0000-0000-000000000000',
  step: 0,

  // добавляет цвта к кеш
  add({ref, rows, ... other}) {
    if(rows) {
      for(const elm of rows) {
        this.add(elm);
      }
    }
    else if((other.clr_in && other.clr_in !== this.blank) || (other.clr_out && other.clr_out !== this.blank)) {
      this.composite[ref] = other;
      other.ref = other.clr_in + other.clr_out;
    }
    else {
      this.simple[ref] = other;
    }
  },

  // база, из которой читаем цвета
  clr_db: new PouchDB(`http://${SERVER || 'localhost'}:5984/wb_meta`, {
    auth: {
      username: DBUSER,
      password: DBPWD
    },
    skip_setup: true,
  }),

  // загрузка цветов
  read() {
    console.log(`collect clrs...`);
    return this.clr_db.allDocs({
      startkey: 'cat.clrs',
      endkey: 'cat.clrsя',
      include_docs: true,
    })
      .then(({rows}) => {
        for(const {doc} of rows) {
          this.add(doc);
        }
      });
  },

  // очередь - пробег по всем продукциям базы
  queue({db, limit = 200, bookmark}) {
    return db.find({
      selector: {class_name: 'cat.characteristics'},
      limit,
      bookmark,
    })
      .then(async(res) => {
        this.step++;
        console.log(`step:${this.step} db: ${db.name}`);
        bookmark = res.bookmark;
        for(const cx of res.docs) {
          this.update(cx)
        }
        //await db.bulkDocs(res.docs);
        return res.docs.length === limit ? this.queue({db, limit, bookmark}) : null;
      });
  },

  // обновляет ссылки в продукции
  update(cx) {

  }
};

clrs.read().then(() => {
  new PouchDB(`http://${SERVER || 'localhost'}:5984/_all_dbs`, {
    auth: {
      username: DBUSER,
      password: DBPWD
    },
    skip_setup: true,
  }).info()
    .then(async (dbs) => {
      for(const name of dbs) {
        if(/^wb_21/.test(name)) {
          const db = new PouchDB(`http://${SERVER || 'localhost'}:5984/${name}`, {
            auth: {
              username: DBUSER,
              password: DBPWD
            },
            skip_setup: true,
          });
          await clrs.queue({db});
        }
      }
      process.exit(0);
    });
});
