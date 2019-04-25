/**
 * проверяет живость сервера отчетов
 *
 * @module reports
 *
 * Created by Evgeniy Malyarov on 10.09.2018.
 */

const fetch = require('node-fetch');
const log_err = require('./log_err');

const {DBUSER, DBPWD} = process.env;

module.exports = {
  name: 'reports',        // имя проверки в статистике
  order: 3,               // порядок исполнения проверки
  break_on_error: false,  // ошибка не связана с другими проверками
  mail_on: 2,             // если 2 раза подряд - пишем письмо
  reset: true,            // при повторении ошибки, выполнять перезапуск сервиса эскизов
  method (db, {http}) {
    if(!http) {
      return Promise.resolve({ok: true});
    }
    return fetch(http, {
      credentials: 'include',
      headers: {Authorization: `Basic ${Buffer.from(DBUSER + ":" + DBPWD).toString('base64')}`},
    })
      .then(res => {
        if(res.status === 200) {
          return {ok: true};
        }
        else {
          const err = {status: res.status, message: res.statusText};
          return log_err(err);
        }
      })
      .catch(log_err);
  }
};