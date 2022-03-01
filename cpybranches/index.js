/**
 * Копирует базы всех отделов в новое место
 *
 * @module index
 *
 * Created by Evgeniy Malyarov on 01.03.2022.
 */

const PouchDB = require('pouchdb').plugin(require('pouchdb-find'));
const {username, password, zone, year, source, http, purge} = require('./config');
const progress = require('./progress.json');
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
};

const replicate = async (branch) => {
  // база - источник, у неё свои заголовки
  const sdb = new PouchDB(`${source}wb_${zone}_doc`, {
    auth: {username, password},
    skip_setup: true,
    fetch(url, opts) {
      opts.headers.set('branch', branch.ref);
      opts.headers.set('year', year);
      return PouchDB.fetch(url, opts);
    },
  });
  // база - получатель на нужном сервере с нужным именем
  const target = `${http(branch.server)}${zone}_doc_${branch.suffix}`;
  const tdb = new PouchDB(target, {
    auth: {username, password},
  });

  // проверяем подключение к базам
  return sdb.info()
    .then(() => tdb.info())
    .then(() => {
      // при необходимости пересоздаём базу получателя
      return purge ?
        tdb.destroy()
          .catch(() => null)
          .then(() => new PouchDB(target, {auth: {username, password}}))
        : tdb;
    })
    .then((tdb) => {
      // копируем роли базы
      return clone_security(sdb, tdb)
        .then(() => tdb.replicate.from(sdb))
        .then((res) => {
          console.log(`${new Date().toLocaleTimeString()} read:${res.docs_read} written:${res.docs_written}`);
        });
    });
};

const main = () => {
  console.log('dbs created');
  return cat.init()
    .then(async (branches) => {
      console.log('cat`s inited');
      // бежим по отделам
      for(const branch of branches) {
        // если отдел засинхронизирован ранее - пропускаем
        if(branch.suffix <= progress.suffix) {
          console.log(`skip ${branch.suffix} ${branch.name}`);
          continue;
        }
        // выполняем репликацию
        await replicate(branch);
        console.log(`replicated ${branch.suffix} ${branch.name}`);
        // записываем текущий шаг в progress.json
        progress.suffix = branch.suffix;
        await fs.writeFile(require.resolve('./progress.json'), JSON.stringify(progress, null, '\t'), 'utf8');
      }
    })
    .catch(console.error);
};

main();
