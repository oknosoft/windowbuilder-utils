/**
 * проверяет статус репликаций
 *
 * @module replicate
 *
 * Created by Evgeniy Malyarov on 20.08.2018.
 */

const fetch = require('node-fetch');
const {URL} = require('url');
const log_err = require('./log_err');

module.exports = {
  name: 'replicate',      // имя проверки в статистике
  order: 2,               // порядок исполнения проверки
  break_on_error: true,   // в случае ошибки, последующие проверки выполнять бессмысленно
  mail_on: 4,             // если три раза подряд - пишем письмо
  reset: true,            // при повторении ошибки, выполнять перезапуск couchdb
  method ({__opts}, {http}) {
    if(http) {
      return Promise.resolve({ok: true});
    }
    const url = Object.assign(new URL(__opts.name), __opts.auth);
    function find_errors({errors, skip, limit}) {
      return fetch(`${url.href}_scheduler/docs?skip=${skip}&limit=${limit}`)
        .then(res => res.json())
        .then(res => {
          for(const doc of res.docs) {
            if(doc.database === '_replicator') {
              ['failed', 'error', 'crashing'].indexOf(doc.state) !== -1 && errors.push({
                source: doc.source,
                target: doc.target,
                doc_id: doc.doc_id,
                start_time: doc.start_time,
                last_updated: doc.last_updated,
                info: doc.info || '',
              })
            }
          }
          const processed = skip + limit;
          return !res.total_rows || res.total_rows < processed
            ? (errors.length ? errors : {ok: true})
            : find_errors({errors, skip: processed, limit});
        })
        .catch(log_err);
      }
    
    return find_errors({errors: [], skip: 0, limit: 1000});
  }
};