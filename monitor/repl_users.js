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

module.exports = function repl(servers) {

  // создаём базы
  const src = [];
  const tgt = [];
  const queries = [];

  // находим базу, в которой _users не реплицируется - это будет корень
  for(const server of servers) {
    const db = new PouchDB(`${server.url}_replicator`, {
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
  }

  // сравниваем feed
  Promise.all(queries)
    .then(() => {
      queries.length = 0;
      if(src.length) {
        return new PouchDB(src[0].name.replace('_replicator', '_users'), {
          auth: {
            username: DBUSER,
            password: DBPWD
          },
          skip_setup: true,
          ajax: {timeout: 10000}
        })
          .info()
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

    // перезапускам
    .then((update_seq) => {
      if(update_seq) {
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
        Promise.all(queries)
          .then(() => {
            seq = update_seq;
          });
      }
    });
};