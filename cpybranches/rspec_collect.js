/**
 * Пересчитывает заказы с изделиями без спецификаций
 *
 * @module index
 *
 * Created by Evgeniy Malyarov on 01.03.2022.
 */

const PouchDB = require('pouchdb').plugin(require('pouchdb-find'));
const {username, password, zone, year, source, http, purge} = require('./config');
const orders = require(`./orders_${zone}.json`);
const {clone_security} = require('../mergecut/clone');
const fs = require('fs').promises;

const dbs = {
  ram: new PouchDB(`${source}wb_${zone}_ram`, {
    auth: {username, password},
    skip_setup: true,
  }),
  meta: new PouchDB(`${source}wb_meta`, {
    auth: {username, password},
    skip_setup: true,
  })
};

const cat = {
  branches: [],
  abonents: [],
  servers: [],
  init() {
    // читаем отделы
    return dbs.ram.find({selector: {class_name: 'cat.branches'}, limit: 10000})
      .then(({docs}) => {
        for(const {_id, _rev, ...doc} of docs) {
          doc.ref = _id.substr(13);
          this.branches.push(doc);
        }
        // читаем абонентов
        return dbs.meta.find({selector: {class_name: 'cat.abonents'}, limit: 10000})
      })
      .then(({docs}) => {
        for(const {_id, _rev, ...doc} of docs) {
          doc.ref = _id.substr(13);
          this.abonents.push(doc);
        }
        // читаем серверы
        return dbs.meta.find({selector: {class_name: 'cat.servers'}, limit: 10000})
      })
      .then(({docs}) => {
        for(const {_id, _rev, ...doc} of docs) {
          doc.ref = _id.substr(12);
          this.servers.push(doc);
        }
        const rm = [];
        for(const doc of this.branches) {
          // подклеиваем абонента к отделу
          doc.owner = this.abonents.find((abonent) => abonent.ref === doc.owner);
          // удаляем отделы чужих и неактивных абонентов
          if(doc.use && doc?.owner?.id == zone) {
            // подклеиваем родителя к отделу
            doc.parent = this.branches.find((branch) => branch.ref === doc.parent);
            // подклеиваем сервер к отделу
            if(doc.server && doc.server != '00000000-0000-0000-0000-000000000000') {
              doc.server = this.servers.find((server) => server.ref === doc.server);
            }
            else {
              delete doc.server;
              Object.defineProperty(doc, 'server', {
                get() {
                  return this.parent ? this.parent.server : this.owner.server;
                }
              });
            }
          }
          else {
            rm.push(doc);
          }
        }
        // подклеиваем сервер к абоненту
        for(const doc of this.abonents) {
          doc.server = this.servers.find((server) => server.ref === doc.server);
        }
        // удаляем отделы чужих абонентов
        for(const doc of rm) {
          const index = this.branches.indexOf(doc);
          this.branches.splice(index, 1);
        }
        // сортируем по возрастанию суффиксов, чтобы гарантировать одинаковый порядок обхода отделов
        this.branches.sort((a, b) => {
          if(a.suffix < b.suffix) {
            return -1;
          }
          else if(a.suffix > b.suffix) {
            return 1;
          }
          else {
            return 0;
          }
        });
        return this.branches;
      });
  },
  limit: 200,
  step: 1,

  collect({branch, bookmark, sdb}) {

    // база - источник, у неё свои заголовки
    if(!sdb) {
      sdb = new PouchDB(`${source}wb_${zone}_doc`, {
        auth: {username, password},
        skip_setup: true,
        fetch(url, opts) {
          opts.headers.set('branch', branch.ref);
          opts.headers.set('year', year);
          return PouchDB.fetch(url, opts);
        },
      });
    }

    return sdb.find({
      selector: {
        class_name: 'cat.characteristics',
        'timestamp.moment': {$gt: '2022-02-20'},
        $not: {coordinates: {$size: 0}},
        $or: [
          {specification: {$exists: false}},
          {specification: {$size: 0}}
        ]},
      limit: this.limit,
      bookmark,
    })
      .then(async (res) => {
        this.step++;
        bookmark = res.bookmark;
        for (const doc of res.docs) {
          if(doc.obj_delivery_state !== 'Архив') {
            this.orders.add(doc.calc_order);
          }
        }
        return res.docs.length === this.limit ? this.collect({branch, bookmark, sdb}) : this.orders.size;
      })
      .catch((err) => {
        if(err.status === 404) {
          return 0;
        }
        else {
          throw err;
        }
      });
  },
  main() {
    console.log('dbs created');
    return this.init()
      .then(async (branches) => {
        console.log('cat`s inited');
        // бежим по отделам
        for(const branch of branches) {
          // накапливаем продукции
          this.orders.clear();
          const count = await this.collect({branch});

          if(count) {
            orders.push({branch: branch.ref, suffix: branch.suffix, orders: Array.from(this.orders)});
            await fs.writeFile(require.resolve(`./orders_${zone}.json`), JSON.stringify(orders, null, '\t'), 'utf8');
          }

          console.log(`collected ${branch.suffix} ${branch.name}`);
        }
      })
      .catch(console.error);
  },
  orders: new Set(),
};


cat.main();
