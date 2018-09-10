/**
 * проверяет статус репликаций
 *
 * @module replicate
 *
 * Created by Evgeniy Malyarov on 20.08.2018.
 */

const fetch = require('node-fetch');
const {URL} = require('url');

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
    return fetch(`${url.href}_scheduler/jobs`)
      .then(res => res.json())
      .then(res => {
        const errors = [];
        for(const job of res.jobs) {
          if(job.database === '_replicator' && job.history) {
            const status = job.history[0];
            status.type !== 'started' && status.type !== 'added' && errors.push(Object.assign(status, {
              source: job.source,
              target: job.target,
              doc_id: job.doc_id,
              start_time: job.start_time,
            }))
          }
        }
        return errors.length ? errors : {ok: true};
      })
      .catch((err) => {
        console.error(err);
        return err;
      });
  }
};