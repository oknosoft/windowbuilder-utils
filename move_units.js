/**
 * ### Модуль переноса единиц измерения вовнутрь номенклатур
 *
 * @module  move_units
 *
 * Created 24.02.2018
 */

/**
 * ### Переменные окружения
 * DEBUG "wb:*,-not_this"
 * ZONE 21
 * DBPWD admin
 * DBUSER admin
 * COUCHPATH http://cou221:5984/wb_
 */

'use strict';

const debug = require('debug')('wb:move_units');
const PouchDB = require('./pouchdb')
  .plugin(require('pouchdb-find'));

debug('required');

// инициализируем параметры сеанса и метаданные
const {DBUSER, DBPWD, COUCHPATH, ZONE} = process.env;
const prefix = 'wb_';
const blank = '00000000-0000-0000-0000-000000000000';
let step = 0;

const db = new PouchDB(`${COUCHPATH}${ZONE}_ram`, {
  auth: {
    username: DBUSER,
    password: DBPWD
  },
  skip_setup: true,
});

db.info()
  .then((info) => {
    debug(`connected to ${info.host}, doc count: ${info.doc_count}`);
  })
  .then(move_units)
  .then(() => debug(`ok`));

function bulk(rows) {
  return () => {
    step++;
    debug(`saved ${step * 300}`);
    return db.bulkDocs(rows);
  };
}

function move_units(bookmark) {
  const opt = {limit: 100};

  // получаем в ОЗУ все номенклатуры и единицы измерения
  return db.find({selector: {class_name: {$in: ['cat.nom', 'cat.nom_units']}}, bookmark, limit: 100000})
    .then(({docs}) => {
      debug(`received ${docs.length} rows`);
      // Разделим на два массива
      const noms = [];
      const units = [];
      const rows = [];
      for(const doc of docs) {
        if(doc._id.startsWith('cat.nom_units')) {
          units.push(doc);
        }
        else {
          noms.push(doc);
        }
      }
      for(const nom of noms) {
        if(nom.is_folder) {
          continue;
        }
        let nunits = '';
        let ch;
        const ref = nom._id.substr(8);
        for(const unit of units) {
          if(unit.owner === ref) {
            if(nunits) {
              nunits += '\n';
            }
            nunits += `${unit._id.substr(14)},${unit.id},${unit.name},${unit.qualifier_unit},${unit.heft},${unit.volume},${unit.coefficient},${unit.rounding_threshold}`;
          }
        }
        for(let fld in nom) {
          if(nom[fld] === blank) {
            nom[fld] = '';
            ch = true;
          }
        }
        if(ch || (nom.units !== nunits && nunits)) {
          nom.units = nunits;
          rows.push(nom);
        }
      }

      return {rows, units};
    })
    .then(({rows, units}) => {
      let res = Promise.resolve();
      let tmp = [];
      rows.forEach((row) => {
        if(tmp.length < 300) {
          tmp.push(row);
        }
        else {
          res = res.then(bulk(tmp));
          tmp = [];
        }
      });
      if(tmp.length) {
        res = res.then(bulk(tmp));
      }
      return res.then(() => {
        db.bulkDocs(units.map((row) => {
          return {
            _id: row._id,
            _rev: row._rev,
            _deleted: true,
          }
        }));
      });
    })
    .catch(err => {
      debug(err)
    });
}
