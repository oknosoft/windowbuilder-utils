/**
 *
 *
 * @module clone
 *
 * Created by Evgeniy Malyarov on 31.12.2019.
 */

const PouchDB = require('../pouchdb');
const fs = require('fs');
const fetch = require('node-fetch');
const {start} = require('./config');
const {DBUSER, DBPWD} = process.env;
const limit = 200;
const timeout = 120000;
const cnames = ['doc.calc_order', 'cat.characteristics'];
const progress = require('./progress.json');
let step = 0;

module.exports = function ({src, tgt, suffix, all_docs, exclude = [], include = [], remove = []}) {

  let index = 1;

  // перебирает базы в асинхронном цикле
  function next(dbs) {
    index++;
    let name = dbs[index];
    if(name && include.length && !include.includes(name)) {
      return next(dbs);
    }
    if(name && name[0] !== '_' && !exclude.includes(name)) {
      return clone({src, tgt, name, suffix, all_docs, remove})
        .then(() => next(dbs));
    }
    if(name) {
      return next(dbs);
    }
  }

  // получаем массив всех баз
  return new PouchDB(`${src}/_all_dbs`, {
    auth: {
      username: DBUSER,
      password: DBPWD
    },
    skip_setup: true,
    ajax: {timeout}
  }).info()
    .then(next);

};

function sleep(time, res) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(res), time);
  });
}

// выполняет обслуживание
function clone({src, tgt, name, suffix, all_docs, remove}) {
  // получаем базы
  src = new PouchDB(`${src}/${name}`, {
    auth: {
      username: DBUSER,
      password: DBPWD
    },
    skip_setup: true,
    ajax: {timeout}
  });
  tgt = new PouchDB(`${tgt}/${name}${suffix ? '_' + suffix : ''}`, {
    auth: {
      username: DBUSER,
      password: DBPWD
    },
    ajax: {timeout}
  });

  return clone_security(src, tgt)
    .then(() => next_docs(src, tgt, progress[src.name] || '', all_docs))
    .then(() => {
      if(remove.includes(name)) {
        return src.destroy();
      }
    });

}

function clone_security(src, tgt) {
  return tgt.info()
    .then(() => src.get('_security'))
    .then((doc) => {
      return fetch(`${tgt.name}/_security`, {
        method: 'PUT',
        credentials: 'include',
        headers: {Authorization: `Basic ${Buffer.from(DBUSER + ":" + DBPWD).toString('base64')}`},
        body: JSON.stringify(doc),
      })
    })
    .then((res) => {
      console.log(`${tgt.name} _security`);
      return res.json();
    })
}
module.exports.clone_security = clone_security;

function next_docs(src, tgt, startkey, all_docs) {
  return src.allDocs({
    include_docs: true,
    attachments: true,
    startkey,
    endkey: '\u0fff',
    skip: startkey ? 1 : 0,
    limit,
  })
    .then(({rows}) => clone_docs(rows, tgt, all_docs))
    .then(({rows = [], dcount = 0}) => {

      if(rows.length) {
        progress[src.name] = rows[rows.length-1].key;
        fs.writeFile(`progress.json`, JSON.stringify(progress), 'utf8', (err) => err && console.log(err));
        step++;
        console.log(`${tgt.name} step: ${step}, key: ${progress[src.name]}, dcount: ${dcount}`);
      }

      if(rows.length === limit) {
        return next_docs(src, tgt, progress[src.name], all_docs);
      }
    });
}

function clone_docs(rows, tgt, all_docs) {
  const docs = rows
    .map(({doc}) => doc)
    .filter((doc) => {
      if(all_docs || doc._id.startsWith('_') || !tgt.name.includes('_doc') || !cnames.includes(doc.class_name)) {
        return true;
      }
      return (doc.timestamp && doc.timestamp.moment > start) || doc.obj_delivery_state === 'Шаблон';
    });
  if(!docs.length) {
    return rows;
  }
  // получаем ревизии документов, которые могут уже присутствовать в tgt и фильтруем
  return tgt
    .allDocs({keys: rows.map(({key}) => key)})
    .then((res) => {
      const filtered = docs.filter((doc) => {
        return !res.rows.some((tdoc) => {
          return tdoc.id === doc._id && tdoc.value && tdoc.value.rev >= doc._rev;
        });
      });
      return filtered.length ? tgt
        .bulkDocs(filtered, {new_edits: false})
        .then(() => filtered.length)
        :
        filtered.length;
    })
    .then((dcount) => sleep(100, {rows, dcount}));
}