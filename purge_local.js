/**
 * Прочищает _local_docs
 *
 * @module purge_local
 *
 * Created by Evgeniy Malyarov on 18.08.2019.
 */


'use strict';

const debug = require('debug')('wb:purge');
const PouchDB = require('./pouchdb')
  .plugin(require('pouchdb-find'));

debug('required');

// инициализируем параметры сеанса и метаданные
const {DBUSER, DBPWD, COUCHPATH, ZONE} = process.env;
const prefix = 'wb_';
const suffixes = ['0020', '0021', '0022', '0026', '0027', '0028'];
const range = ['20170900', '20190530'];

const src = new PouchDB(`${COUCHPATH}${ZONE}_doc`, {
  auth: {
    username: DBUSER,
    password: DBPWD
  },
  skip_setup: true,
  ajax: {timeout: 100000}
});

src.info()
  .then(async (info) => {
    debug(`connected to ${info.host}, doc count: ${info.doc_count}`);
    for(const suffix of suffixes) {
      debug(`prosessing ${suffix}`);
      await purge(suffix);
    }
  })
  .then((res) => {
    debug('all done');
  })
  .catch(err => {
    debug(err)
  });

async function purge(suffix) {
  let d = next(range[0]);
  while (d < range[1]) {
    try{
      await purgeDoc(`_local/log.${suffix}.${d}`)
    }
    catch (err) {
      debug(err);
    }
    d = next(d);
  }
}

function purgeDoc(_id) {
  return src.get(_id)
    .then((doc) => {
      return src.remove(doc);
    })
    .catch((err) => {
      err = null;
    });
}

function next(num) {
  const v = num.replace(/(\d\d\d\d)(\d\d)/, '$1 $2 ').split(' ').map((v) => parseInt(v, 10));
  if(v[2] < 31) {
    v[2] += 1;
  }
  else {
    v[2] = 1;
    if(v[1] < 12) {
      v[1] += 1;
    }
    else {
      v[1] = 1;
      v[0] += 1;
    }
    if(v[1] < 10) {
      v[1] = '0' + v[1];
    }
    debug(`${v[0]}-${v[1]}`);
  }
  if(typeof v[1] === 'number' && v[1] < 10) {
    v[1] = '0' + v[1];
  }
  if(v[2] < 10) {
    v[2] = '0' + v[2];
  }
  return v.join('');
}