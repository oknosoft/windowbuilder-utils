/**
 * полуавтоматическая репликация _users
 *
 * @module repl_users
 *
 * Created by Evgeniy Malyarov on 28.08.2018.
 */

const PouchDB = require('../pouchdb').plugin(require('pouchdb-find'));
const {DBUSER, DBPWD} = process.env;

let seq;

function find_users({users, db, since, limit}) {
  return db.changes({since, limit, include_docs: true})
    .then(res => {
      for (const result of res.results) {
        users.push(result.doc);
      }

      return res.results.length < limit ? users
        : find_users({users, db, since: res.last_seq, limit});
    });
}

module.exports = function repl(servers, options) {

  // создаём базы
  const use_repl = options && options.use_repl;
  const src = [];
  const tgt = [];
  const queries = [];
  let src_db;

  // находим базу, в которой _users не реплицируется - это будет корень,
  // если репликации не используем, корневой базой является первая по списку
  for(const {url} of servers) {
    if (!url)
      continue;
    
    // режим перезапуска репликаций
    if (use_repl) {
      const db = new PouchDB(`${url}_replicator`, {
        auth: {
          username: DBUSER,
          password: DBPWD
        },
        skip_setup: true,
        ajax: {timeout: 10000}
      });
      queries.push(db.find({
        selector: {
          target: {$regex: "/_users$"}
        },
        fields: ["_id"]
      }).then(({docs}) => {
        if(docs.length){
          db._users_repl = docs[0]._id;
          tgt.push(db);
        }
        else {
          src.push(db);
        }
      }).catch((err) => {
        console.log(err);
      }));
    } else {
      const src_tgt = src.length ? tgt : src;
      const db = new PouchDB(`${url}_users`, {
        auth: {
          username: DBUSER,
          password: DBPWD
        },
        skip_setup: true,
        ajax: {timeout: 10000}
      });
      src_tgt.push(db);
    }
  }

  // сравниваем feed
  return Promise.all(queries)
    .then(() => {
      queries.length = 0;
      if(src.length) {
        if (use_repl) {
          src_db = new PouchDB(src[0].name.replace('_replicator', '_users'), {
            auth: {
              username: DBUSER,
              password: DBPWD
            },
            skip_setup: true,
            ajax: {timeout: 10000}
          });
        } else {
          src_db = src[0];
        }

        return src_db.info()
          .then(({update_seq}) => {
            if(!seq) {
              seq = update_seq;
            }
            else {
              return seq !== update_seq && update_seq;
            }
          });
      }
    })

    // перезапускаем
    .then((update_seq) => {
      if(update_seq) {
        if (use_repl) {
          for(const db of tgt) {
            queries.push(db.get(db._users_repl)
              .then((doc) => {
                for(const fld in doc) {
                  if(fld !== '_id' && fld !== '_rev' && fld[0] === '_') {
                    delete doc[fld];
                  }
                }
                return db.put(doc);
              }));
          }
          return Promise.all(queries)
            .then(() => {
              seq = update_seq;
            });
        } else {
          return find_users({users: [], db: src_db, since: seq, limit: 100})
            .then(docs => {
              for(const db of tgt) {
                queries.push(db.bulkDocs(docs, {new_edits: false})
                  .then(res => {
                    // проверяем документы на конфликтные ревизии
                    return docs.reduce((prev, doc) => {
                      return prev.then(() => {
                        return db.get(doc._id, {conflicts: true})
                          .then(res => {
                            // удаляем конфликтные ревизии документа
                            if (res._conflicts) {
                              return res._conflicts.reduce((prev, rev) => {
                                return prev.then(() => {
                                  return db.remove(res._id, rev)
                                    .catch(err => {});
                                });
                              }, Promise.resolve());
                            }
                          })
                          .catch(err => {});
                      });
                    }, Promise.resolve());
                  }));
              }
              return Promise.all(queries)
                .then(() => {
                  seq = update_seq;
                });
            });
        }
      }
    });
};