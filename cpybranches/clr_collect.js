/**
 * Ищет продукции с составными цветами
 *
 * @module index
 *
 * Created by Evgeniy Malyarov on 01.03.2022.
 */

const PouchDB = require('pouchdb').plugin(require('pouchdb-find'));
const {username, password, zone, year, source, http, purge, mode} = require('./config');
const progress = require('./progress.json');
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

const presave = [
  {
    "ref": "a109724a-10b7-44ea-b57a-e32d45765490"
  },
  {
    "ref": "934fca04-289e-11e9-81fe-005056aafe4c"
  },
  {
    "ref": "536afd80-5ae6-11ea-85a8-358e2e144ccd"
  },
  {
    "ref": "9ceb898b-6cd8-4702-a258-472f39b39872"
  },
  {
    "ref": "535fb2e0-5ae6-11ea-85a8-358e2e144ccd"
  },
  {
    "ref": "a67b3da7-289e-11e9-81fe-005056aafe4c"
  },
  {
    "ref": "6b2f64ee-ddc0-4d60-d599-d54831782a0e"
  },
  {
    "ref": "6a749068-faf9-11df-845b-00215ad499af"
  },
  {
    "ref": "57019a9c-fafd-11df-845b-00215ad499af"
  },
  {
    "ref": "6a74906b-faf9-11df-845b-00215ad499af"
  },
  {
    "ref": "4d7241af-ee7a-11e4-811a-00155d001434"
  },
  {
    "ref": "6a749074-faf9-11df-845b-00215ad499af"
  },
  {
    "ref": "f9f2bffb-f39c-11e3-a3d4-00215ad499af"
  },
  {
    "ref": "36b0303d-fb01-11df-845b-00215ad499af"
  },
  {
    "ref": "57019a94-fafd-11df-845b-00215ad499af"
  },
  {
    "ref": "6a74905d-faf9-11df-845b-00215ad499af"
  },
  {
    "ref": "bcffeeb9-1c9f-11e5-811d-00155d001434"
  },
  {
    "ref": "57019aab-fafd-11df-845b-00215ad499af"
  },
  {
    "ref": "6a749050-faf9-11df-845b-00215ad499af"
  },
  {
    "ref": "57019a82-fafd-11df-845b-00215ad499af"
  },
  {
    "ref": "6a749069-faf9-11df-845b-00215ad499af"
  },
  {
    "ref": "57019a77-fafd-11df-845b-00215ad499af"
  },
  {
    "ref": "c35a47f1-f0f4-11e1-ae6b-00215ad499af"
  },
  {
    "ref": "b87f7766-c0be-49cb-b466-d612777b1951"
  },
  {
    "ref": "7c6906b1-310c-11e9-81fe-005056aafe4c"
  },
  {
    "ref": "7a383120-50bf-11ea-ae53-3138964a5c0d"
  },
  {
    "ref": "7a262fc0-50bf-11ea-ae53-3138964a5c0d"
  },
  {
    "ref": "0b5b7cd0-6375-11ea-ba4c-8de712bf8bcb"
  },
  {
    "ref": "cf9ece7d-7b12-11e9-8202-005056aafe4c"
  },
  {
    "ref": "c56759c0-909e-11ec-8072-bf415e538b8f"
  },
];

const cat = {
  branches: [],
  abonents: [],
  servers: [],
  clrs: [],
  composite: new Map(),
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
        // читаем цвета
        return dbs.meta.find({selector: {class_name: 'cat.clrs'}, limit: 10000})
      })
      .then(({docs}) => {
        for(const {rows} of docs) {
          for(const doc of rows) {
            this.clrs.push(doc);
          }
        }
        for(const doc of this.clrs) {
          if(doc.parent) {
            doc.parent = this.clrs.find(({ref}) => ref === doc.parent);
          }
          if(doc.clr_in) {
            doc.clr_in = this.clrs.find(({ref}) => ref === doc.clr_in);
          }
          if(doc.clr_out) {
            doc.clr_out = this.clrs.find(({ref}) => ref === doc.clr_out);
          }
          if(doc.clr_in && doc.clr_out) {
            this.composite.set(doc.ref, doc.clr_in.ref + doc.clr_out.ref);
          }
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
      const opts = {auth: {username, password}, skip_setup: true};
      if(branch) {
        opts.fetch = function fetch(url, opts) {
          opts.headers.set('branch', branch.ref);
          opts.headers.set('year', year);
          return PouchDB.fetch(url, opts);
        };
      }
      sdb = new PouchDB(`${source}wb_${zone}_doc`, opts);
    }

    return sdb.find({
      selector: {class_name: 'cat.characteristics'},
      limit: this.limit,
      bookmark,
    })
      .then(async (res) => {
        this.step++;
        bookmark = res.bookmark;
        for (const doc of res.docs) {
          this.all++;
          if(doc.obj_delivery_state === 'Шаблон') {
            continue;
          }
          let ch;
          if(this.composite.has(doc.clr)) {
            doc.clr = this.composite.get(doc.clr);
            ch = true;
          }
          if(Array.isArray(doc.specification)) {
            for(const row of doc.specification) {
              if(this.composite.has(row.clr)) {
                row.clr = this.composite.get(row.clr);
                ch = true;
              }
            }
          }
          if(Array.isArray(doc.inserts)) {
            for(const row of doc.inserts) {
              if(this.composite.has(row.clr)) {
                row.clr = this.composite.get(row.clr);
                ch = true;
              }
            }
          }
          if(Array.isArray(doc.coordinates)) {
            for(const row of doc.coordinates) {
              if(this.composite.has(row.clr)) {
                row.clr = this.composite.get(row.clr);
                ch = true;
              }
            }
          }

          if(ch) {
            this.orders.add(doc);
          }
        }

        if(this.orders.size > 100 || res.docs.length < this.limit) {
          try {
            await sdb.bulkDocs(Array.from(this.orders));
            this.elmnts += this.orders.size;
            this.orders.clear();
            console.log(`${new Date().toTimeString().substr(0, 8)} ${this.elmnts} of ${this.all} ${branch?.suffix || '0000'} ${branch?.name || 'root'}`);
          }
          catch (e) {
            console.error(e);
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
  move() {
    const clrs = [];
    for(const clr of this.clrs) {
      // if(this.composite.has(clr.ref)) {
      //   continue;
      // }
      if(clr._deleted || !presave.find(({ref}) => ref === clr.ref)) {
        continue;
      }
      clr._id = `cat.clrs|${clr.ref}`;
      if(!clr.parent) {
        clr.parent = '00000000-0000-0000-0000-000000000000';
      }
      else if(clr?.parent?.ref) {
        clr.parent = clr.parent.ref;
      }
      clrs.push(clr);
    }
    console.log(clrs.length);

    for (const clr of clrs) {
      delete clr.ref;
      if(clr.clr_out === clr) {
        delete clr.clr_out;
      }
      if(clr.clr_in === clr) {
        delete clr.clr_in;
      }
      if(clr?.clr_in?.ref) {
        clr.clr_in = clr.clr_in.ref;
      }
      if(clr?.clr_out?.ref) {
        clr.clr_out = clr.clr_out.ref;
      }
      delete clr.timestamp;
      clr.class_name = 'cat.clrs';
    }
    return dbs.ram.bulkDocs(clrs)
      .then((res) => {
        console.log(res);
      });

    // dbs.ram.allDocs({keys: clrs.map((clr) => clr._id)})
    //   .then(({rows}) => {
    //     for (const {key, value} of rows) {
    //       const clr = clrs.find((v) => v._id === key);
    //       if(clr) {
    //         clrs.splice(clrs.indexOf(clr), 1);
    //       }
    //     }
    //     for (const clr of clrs) {
    //       delete clr.ref;
    //       delete clr.clr_in;
    //       delete clr.clr_out;
    //       delete clr.timestamp;
    //       clr.class_name = 'cat.clrs';
    //       clr._rev = rows.find((v) => v.key === clr._id).value.rev;
    //     }
    //     //return dbs.ram.bulkDocs(clrs);
    //   })
    //   .then((res) => {
    //     console.log(res);
    //   });
  },
  main() {
    console.log('dbs created');
    return this.init()
      .then(async (branches) => {
        console.log('cat`s inited');

        if(mode === 'move') {
          return this.move();
        }

        // корневая база
        if(!this.suffix) {
          await this.collect({branch: null});
        }

        // бежим по отделам
        for(const branch of branches) {

          // если отдел засинхронизирован ранее - пропускаем
          if(branch.suffix <= this.suffix) {
            console.log(`skip ${branch.suffix} ${branch.name}`);
            continue;
          }

          // накапливаем продукции
          this.orders.clear();
          this.elmnts = 0;
          await this.collect({branch});
        }
      })
      .catch(console.error);
  },
  orders: new Set(),
  elmnts: 0,
  all: 0,
  suffix: '',
};


cat.main();
