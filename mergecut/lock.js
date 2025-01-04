/**
 * Запрещает запись в архивные базы
 */

const {tasks} = require('./config');
const PouchDB = require('pouchdb');
const {sleep} = require('./clone');
const {DBUSER, DBPWD} = process.env;

let queue = Promise.resolve();
const _id = '_design/auth';
const validate_doc_update = `function (newDoc, oldDoc, userCtx, secObj) {\n  throw('Запрещено изменять объекты архивной базы');\n}`;

for(const abonent in tasks) {
    const {clone, ...other} = tasks[abonent];
    for(const {src, tgt} of clone) {
        queue = queue
            .then(() => lock({src, tgt, ...other}))
            .catch((err) => {
                console.error(err);
            });
    }
}

function lock({src}) {
    // получаем массив всех баз
    return new PouchDB(`${src}/_all_dbs`, {
        auth: {
            username: DBUSER,
            password: DBPWD
        },
        skip_setup: true,
    }).info()
        .then(async (dbs) => {
            for(const name of dbs) {
                if(name && name.includes('_doc_')) {
                    const sdb = new PouchDB(`${src}/${name}`, {
                        auth: {
                            username: DBUSER,
                            password: DBPWD
                        },
                        skip_setup: true,
                    });
                    try{
                        const auth = await sdb.get(_id);
                        if(auth.validate_doc_update !== validate_doc_update) {
                            auth.validate_doc_update = validate_doc_update;
                            await sdb.put(auth);
                        }
                    }
                    catch (err) {
                        const auth = {_id, validate_doc_update, language: "javascript"};
                        await sdb.put(auth);
                    }
                    await sleep(10);
                    console.log(name);
                }
            }
        });
}