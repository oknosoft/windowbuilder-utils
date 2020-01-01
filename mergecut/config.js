/**
 * ### Настройки обрезания-объединения
 *
 * @module config
 *
 */

module.exports = {
  start: '2019-09-30',
  tasks: {
    kaleva: {
      test: /_8_doc/,
      dbs: [],
      // эти серверы будут клонированы с обрезанием, массив может быть пустым
      clone: [
        {
          src: 'http://192.168.21.208:5984',
          tgt: 'http://192.168.21.109:5984',
        },
      ],
      // данные этих баз будут объединены в tgt, массив может быть пустым
      merge: [
        {
          exclude: ['wb_8_doc'],
          // можно указать список серверов
          src: ['https://c208.oknosoft.com'],
          tgt: 'https://c209.oknosoft.com/wb_8_doc'
        },
      ]
    },
    eco: {
      test: /_21_doc/,
      dbs: [
        'https://dh21.oknosoft.ru:112',
        'https://dh21.oknosoft.ru:178',
        'https://dh21.oknosoft.ru:180',
        'https://dh6.oknosoft.ru:181',
        'https://dh6.oknosoft.ru:182',
        'https://dh4.oknosoft.ru:183',
        'https://dh6.oknosoft.ru:184',
        'https://dh4.oknosoft.ru:185',
        'https://dh5.oknosoft.ru:211',
        'https://dh5.oknosoft.ru:212',
        'https://dh6.oknosoft.ru:76',
        'https://dh4.oknosoft.ru:177',

        // 'http://192.168.21.112:5984',
        // 'http://192.168.21.178:5984',
        // 'http://192.168.21.180:5984',
        // 'http://192.168.21.181:5984',
        // 'http://192.168.21.182:5984',
        // 'http://192.168.21.183:5984',
        // 'http://192.168.21.184:5984',
        // 'http://192.168.21.185:5984',
        // 'http://192.168.21.211:5984',
        // 'http://192.168.21.212:5984',
        // 'http://192.168.21.76:5984',
        // 'http://192.168.21.77:5984',
      ],
      clone: [
        {
          src: 'http://192.168.21.221:5984',
          tgt: 'http://192.168.21.121:5984',
          suffix: '2019',
          all_docs: true,
        },
      ],
    }
  }
}