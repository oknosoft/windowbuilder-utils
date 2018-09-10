/**
 * проверяет отклик сервера
 *
 * @module ping
 *
 * Created by Evgeniy Malyarov on 20.08.2018.
 */

module.exports = {
  name: 'ping',           // имя проверки в статистике
  order: 0,               // порядок исполнения проверки
  break_on_error: true,   // в случае ошибки, последующие проверки выполнять бессмысленно
  mail_on: 2,             // если три раза подряд - пишем письмо
  method (db, {http}) {
    if(http) {
      return Promise.resolve({ok: true});
    }
    return db.info()
      .then(() => ({ok: true}))
      .catch((err) => {
        console.error(err);
        return err;
      });
  }
}