/**
 * Перемножает list_3 на штуки в строках заказов
 *
 * @module list_4
 *
 * Created by Evgeniy Malyarov on 03.02.2021.
 */

const PouchDB = require('pouchdb');
const fs = require('fs');
const list_3 = require('./list_3.json');
const {DBUSER, DBPWD} = process.env;



module.exports = function list_4() {
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
      const okeys = new Set();
      const orders = new Map();
      const prods = new Map();

      // получаем продукции
      for(const elm of list_3.detales) {
        keys.push(`cat.characteristics|${elm.ref}`);
      }
      const tmp = await db_doc.allDocs({include_docs: true, keys});

      // получаем заказы
      for(const elm of tmp.rows) {
        if(elm.doc) {
          okeys.add(`doc.calc_order|${elm.doc.calc_order}`);
          prods.set(elm.id.split('|')[1], elm.doc);
        }

      }
      const {rows} = await db_doc.allDocs({include_docs: true, keys: Array.from(okeys)});
      for(const elm of rows) {
        elm.doc && orders.set(elm.id.split('|')[1], elm.doc.production || []);
      }

      return {prods, orders};
    })
    .then(({prods, orders}) => {
      for(const elm of list_3.detales) {
        const prod = prods.get(elm.ref);
        elm.quantity = 1;
        if(!prod) {
          continue;
        }
        const rows = orders.get(prod.calc_order);
        if(!rows) {
          continue;
        }
        const row = rows.find(({characteristic}) => characteristic === elm.ref);
        if(row) {
          elm.quantity = row.quantity;
        }
      }
      let length = 0;
      for(const elm of list_3.detales) {
        length += elm.length * elm.quantity;
      }
      list_3.length = length;
      fs.writeFile(`list_4.json`, JSON.stringify(list_3), 'utf8', (err) => err && console.log(err));
    })
};