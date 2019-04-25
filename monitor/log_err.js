/**
 * Записывает информацию об ошибке в лог
 * добавляет отметку времени, прячет логин-пароль
 *
 * @module log_err
 *
 * Created by Evgeniy Malyarov on 25.04.2019.
 */

const {DBPWD} = process.env;
const urlencode = require('urlencode');
const credentials = [new RegExp(DBPWD, 'g'), new RegExp(urlencode(DBPWD), 'g')];
const hidden = '*****';

function dateStr() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return `${d.toISOString().replace('Z', '')} GMT+${-d.getTimezoneOffset() / 60}`;
}

module.exports = function (err) {
  const res = Object.assign({time: dateStr()}, typeof err === 'string' ? {err} : err);
  for(const fld in res) {
    if(typeof res[fld] === 'string') {
      for(const credential of credentials) {
        res[fld] = res[fld].replace(credential, hidden);
      }
    }
  }
  console.error(JSON.stringify(res));
  return err;
};

module.exports.dateStr = dateStr;