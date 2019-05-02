/**
 * полуавтоматическая репликация _users
 *
 * @module repl_users
 *
 * Created by Evgeniy Malyarov on 28.08.2018.
 */

const PouchDB = require('../pouchdb').plugin(require('pouchdb-find'));
const {DBUSER, DBPWD} = process.env;

const local_id = '_local/repl_users';

function find_users({db, since, users = [], limit = 200}) {
  return db.changes({since, limit, include_docs: true})
    .then((res) => {
      for (const result of res.results) {
        users.push(result.doc);
      }
      return res.results.length < limit ? users : find_users({users, db, since: res.last_seq, limit});
    });
}

module.exports = function repl(servers) {

  const {repl_users} = require('./config');

  let queue = Promise.resolve();

  for(const {src, tgt} of repl_users) {
    const src_db = new PouchDB(`${src}/_users`, {
      auth: {
        username: DBUSER,
        password: DBPWD
      },
      skip_setup: true
    });
    const tgt_dbs = tgt.map((url) => new PouchDB(`${url}/_users`, {
      auth: {
        username: DBUSER,
        password: DBPWD
      },
      skip_setup: true
    }));

    queue = queue
      .then(() => src_db.info())
      .then(({update_seq}) => {
        return src_db.get(local_id)
          .catch(err => {
            if (err.status === 404) {
              return {_id: local_id};
            }
          })
          .then((rev) => {
            if (rev) {
              if(!rev.last_seq) {
                rev.last_seq = update_seq;
                return src_db.put(rev)
                  .then(() => null)
                  .catch(() => null);
              }
              else if(rev.last_seq !== update_seq) {
                return {rev, update_seq};
              }
            }
          });
      })
      .then((res) => {
        if(res) {
          let queries = Promise.resolve();
          return find_users({db: src_db, since: res.rev.last_seq})
            .then((docs) => {
              for(const db of tgt_dbs) {
                queries = queries
                  .then(() => db.bulkDocs(docs, {new_edits: false})
                  .then(res => {
                    // проверяем документы на конфликтные ревизии
                    return docs.reduce((prev, doc) => {
                      return prev.then(() => {
                        return db.get(doc._id, {conflicts: true})
                          .then(res => {
                            // удаляем конфликтные ревизии документа
                            if (res._conflicts) {
                              return res._conflicts.reduce((prev, rev) => {
                                return prev.then(() => db.remove(res._id, rev).catch(err => null));
                              }, Promise.resolve());
                            }
                          })
                          .catch(err => null);
                      });
                    }, Promise.resolve());
                  }));
              }
              return queries
                .then(() => {
                  res.rev.last_seq = res.update_seq;
                  return src_db.put(res.rev);
                });
            });
        }
      });
  };
  return queue;
};