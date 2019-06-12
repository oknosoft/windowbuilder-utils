/**
 * ### Настройки монитора
 * в переменных окружения оставись только пароли
 *
 * @module config
 *
 * Created by Evgeniy Malyarov on 02.05.2019.
 */

module.exports = {
  couchdbs: [
    'https://dh21.oknosoft.ru:208',
    'https://dh5.oknosoft.ru:221',
    'https://dh5.oknosoft.ru:212',
    'https://dh6.oknosoft.ru:76',
    'https://dh6.oknosoft.ru:181',
    'https://dh6.oknosoft.ru:182',
    'https://dh4.oknosoft.ru:177',
    'https://dh4.oknosoft.ru:183',
    'https://dh21.oknosoft.ru:178',
    'https://dh21.oknosoft.ru:180',
    'https://dh21.oknosoft.ru:112',
  ],
  ign_root: [':76/',':177/'],
  repl_users: [{
    src: 'https://dh5.oknosoft.ru:221',
    tgt: [
      'https://dh5.oknosoft.ru:212',
      'https://dh6.oknosoft.ru:76',
      'https://dh6.oknosoft.ru:181',
      'https://dh6.oknosoft.ru:182',
      'https://dh4.oknosoft.ru:177',
      'https://dh4.oknosoft.ru:183',
      'https://dh21.oknosoft.ru:178',
      'https://dh21.oknosoft.ru:180',
      'https://dh21.oknosoft.ru:112',
    ]
  }],
  reports: 'https://zakaz.ecookna.ru/r/img/doc.calc_order/eb23b5e6-62fc-4834-8dae-5e3cf24e97af?glasses',
  reportsssh: 'dh5.oknosoft.ru:221',
  compact_interval: 3,
}