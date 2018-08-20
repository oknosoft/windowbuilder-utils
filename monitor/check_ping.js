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
  mail_on: 3,             // если три раза подряд - пишем письмо
  method (db) {
    return db.info()
      .then(() => ({ok: true}))
      .catch((err) => err);
  }
}