/**
 * Починка после аварии мастер-базы MDM
 *
 * @module mdm_compare_union
 *
 * Created by Evgeniy Malyarov on 27.07.2019.
 */

'use strict';

const debug = require('debug')('wb:mdm');
const PouchDB = require('./pouchdb').plugin(require('pouchdb-find'));

debug('required');

// инициализируем параметры сеанса и метаданные
const {DBUSER, DBPWD} = process.env;

const master = new PouchDB('http://eco-office.oknosoft.ru:5984/wb_21_ram', {
  auth: {
    username: DBUSER,
    password: DBPWD
  },
  skip_setup: true,
  ajax: {timeout: 100000}
});

const slave = new PouchDB('https://dh21.oknosoft.ru:208/wb_8_ram', {
  auth: {
    username: DBUSER,
    password: DBPWD
  },
  skip_setup: true,
  ajax: {timeout: 100000}
});

function sleep(time, res) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(res), time);
  });
}

// читаем весь slave в озу
slave.allDocs({include_docs: true}).then(async ({rows}) => {
  const work = [];
  for(let i=10600; i<rows.length; i++) {
    const {doc} = rows[i];
    try{
      if(doc._id.startsWith('_')) continue;
      await sleep(20);
      const mdoc = await master.get(doc._id);
      if(mdoc._rev === doc._rev) {
        continue;
      }
      if(mdoc.timestamp && doc.timestamp) {
        if(mdoc.timestamp.moment == doc.timestamp.moment) {
          continue;
        }
        if(mdoc.timestamp.moment.startsWith('2019-07-24T00')) {
          await master.remove(mdoc);
          await master.bulkDocs([doc], {new_edits: false});
          continue;
        }
        else if(mdoc.timestamp.moment > doc.timestamp.moment) {
          if(mdoc.hasOwnProperty('zones')) {
            if(mdoc.zones.includes("'8'") || (mdoc.direct_zones && mdoc.direct_zones.includes("'8'"))) {
              await slave.remove(doc);
              await slave.bulkDocs([mdoc], {new_edits: false});
            }
            else {
              await slave.remove(doc);
            }
          }
          else {
            work.push({doc, mdoc});
          }
          continue;
        }
        else if(mdoc._rev > '1' && doc._rev > mdoc._rev) {
          await master.remove(mdoc);
          await master.bulkDocs([doc], {new_edits: false});
          continue;
        }
        work.push({doc, mdoc});
      }
    }
    catch(err) {
      work.push({doc, mdoc});
    }
  }
});