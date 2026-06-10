/**
 * ### Модуль переноса характеристик вовнутрь номенклатур
 *
 * Created 10.06.2026
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

const debug = require('debug')('wb:move_cx');
const PouchDB = require('pouchdb').plugin(require('pouchdb-find'));

debug('required');

// инициализируем параметры сеанса и метаданные
const {DBUSER, DBPWD, COUCHPATH, ZONE} = process.env;
const prefix = 'wb_';
const blank = '00000000-0000-0000-0000-000000000000';
const stopNomKinds = ['eec9c933-cfc2-4c98-b502-b781ddacd903', 'd8898b8c-48bf-11ea-820a-005056aafe4c', '300833bd-ef68-11e9-8204-005056aafe4c']
let step = 0;

const db = new PouchDB(`${COUCHPATH}${ZONE}_ram`, {
    auth: {
        username: DBUSER,
        password: DBPWD
    },
    skip_setup: true,
    ajax: {timeout: 100000}
});

db.info()
    .then((info) => {
        debug(`connected to ${info.host}, doc count: ${info.doc_count}`);
    })
    .then(move_cx)
    .then(() => debug(`ok`));

function bulk(rows) {
    return () => {
        step++;
        debug(`saved ${step * 150}`);
        return db.bulkDocs(rows);
    };
}

function move_cx(bookmark) {

    // получаем в ОЗУ все номенклатуры и единицы измерения
    return db.find({selector: {
            class_name: {$in: ['cat.nom', 'cat.characteristics']},
            constructions: {$or: [{$exists: false}, {$size: 0}]},
            obj_delivery_state: {$or: [{$exists: false}, {$eq: ''}]}
        }, bookmark, limit: 100000})
        .then(({docs}) => {
            debug(`received ${docs.length} rows`);
            // Разделим на два массива
            const noms = new Map();
            const cxs = [];
            const saveRows = new Set();
            const rmRows = [];
            for(const doc of docs) {
                if(doc._id.startsWith('cat.characteristics')) {
                    cxs.push(doc);
                }
                else {
                    noms.set(doc._id.substring(8), doc);
                }
            }
            for(const {_id, _rev, owner, timestamp, class_name, constructions, coordinates, specification, product,
                leading_elm, editor, captured, obj_delivery_state, inserts, cnn_elmnts, search, glass_specification, glasses,
                partner, department, ...cx} of cxs) {
                const nom = noms.get(owner);
                if(!nom || stopNomKinds.includes(nom.nom_kind)) {
                    continue;
                }
                if(!nom.characteristics) {
                    nom.characteristics = [];
                    saveRows.add(nom);
                }
                const ref = _id.substring(20);
                if(!nom.characteristics.find(v => v.ref === ref)) {
                    if(cx.params && !cx.params.length) {
                        delete cx.params;
                    }
                    if(cx.extra_fields && !cx.extra_fields.length) {
                        delete cx.extra_fields;
                    }
                    if(Array.isArray(cx.dop) && !cx.dop.length) {
                        delete cx.dop;
                    }
                    nom.characteristics.push({ref, ...cx});
                    saveRows.add(nom);
                }
                rmRows.push({_id, _rev, _deleted: true});
            }

            return {saveRows, rmRows};
        })
        .then(({saveRows, rmRows}) => {
            let res = Promise.resolve();
            let tmp = [];
            for(const row of saveRows) {
                if(tmp.length < 200) {
                    tmp.push(row);
                }
                else {
                    res = res.then(bulk(tmp));
                    tmp = [];
                }   
            }
            if(tmp.length) {
                res = res.then(bulk(tmp));
            }
            return res.then(() => {
                db.bulkDocs(rmRows);
            });
        })
        .catch(err => {
            debug(err)
        });
}
