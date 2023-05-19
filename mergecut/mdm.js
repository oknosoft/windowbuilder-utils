/**
 * Дополняет начальный образ mdm
 *
 * @module mdm
 *
 * Created by Evgeniy Malyarov on 30.01.2022.
 */

const PouchDB = require('pouchdb').plugin(require('pouchdb-find'));
const fs = require('node:fs/promises');
const {DBUSER, DBPWD, RUSER, RPWD} = process.env;

// http://192.168.21.110:5984/wb_10_ram
// http://192.168.21.21:5984/wb_21_ram

const source = new PouchDB(`https://dh5.oknosoft.ru:1110/wb_10_ram`, {
  auth: {
    username: DBUSER,
    password: DBPWD
  },
  skip_setup: true,
});
const target = new PouchDB(`http://cou221:5984/wb_22_ram`, {
  auth: {
    username: RUSER,
    password: RPWD
  },
  skip_setup: true,
});
const reserve = new PouchDB(`https://dh5.oknosoft.ru:1110/wb_11_ram`, {
  auth: {
    username: DBUSER,
    password: DBPWD
  },
  skip_setup: true,
});
const limit = 100;
const problems = require('./mdm_problems.json');

// обработчик документа
function handle(_id, _rev) {
  // если объекта нет в базе приёмника
  return target.get(_id)
    .catch(({status}) => {
      if(status !== 404) {
        return;
      }
      // ищем незахваченную ревизию в источнике
      return source.get(_id, {revs_info: true})
        .then(({_revs_info}) => {
          const docs = [];
          for(const {rev, status} of _revs_info) {
            if(status === 'available') {
              docs.push({id: _id, rev});
            }
          }
          return docs.length ? source.bulkGet({docs}) : {results: []};
        })
        .then(async ({results}) => {
          let doc, problem;
          for(const {docs} of results) {
            const tmp = docs[0] && docs[0].ok;
            if(tmp) {
              if(!tmp.captured || _id.startsWith('cat.individuals')) {
                doc = tmp;
                break;
              }
              else if(!problem) {
                problem = tmp;
              }
            }
          }
          if(!doc) {
            // ищем незахваченную ревизию в резервной базе
            try {
              doc = await reserve.get(_id);
            }
            catch (err) {
              if(err.status !== 404) {
                console.error(err);
              }
            }
          }
          if(doc) {
            try {
              await target.bulkDocs([doc], {new_edits: false});
              return;
            }
            catch (err) {
              if(problem) {
                problem.err = err.message;
              }
              console.error(err);
            }
          }
          if(problem && !problems.find((_id) => _id === problem._id)) {
            problems.push({
              _id,
              _rev,
              name: problem.name,
              err: problem.err,
              user: problem.timestamp?.user,
            });
          }
        });
    });
}

function replicate(bookmark) {
  return source.find({
    selector: {captured: {$ne: false}},
    limit,
    bookmark,
  })
    .then(async (res) => {
      bookmark = res.bookmark;
      for (const doc of res.docs) {
        await handle(doc._id, doc._rev);
      }
      //await db.bulkDocs(res.docs);
      return res.docs.length === limit ? replicate(bookmark) : null;
    });
}

replicate()
  .then(() => {
    return fs.writeFile(`mdm_problems.json`, JSON.stringify(problems), 'utf8');
  });