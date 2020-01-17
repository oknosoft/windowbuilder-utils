/**
 * ### Настройки обрезания-объединения
 *
 * @module config
 *
 */

module.exports = {
  start: '2019-09-30',
  tasks: {
    // kaleva: {
    //   test: /_8_doc/,
    //   dbs: [],
    //   // эти серверы будут клонированы с обрезанием, массив может быть пустым
    //   clone: [
    //     // {
    //     //   src: 'http://192.168.21.208:5984',
    //     //   tgt: 'http://192.168.21.109:5984',
    //     // },
    //   ],
    //   // данные этих баз будут объединены в tgt, массив может быть пустым
    //   merge: [
    //     {
    //       exclude: ['wb_8_doc'],
    //       // можно указать список серверов
    //       src: ['https://c208.oknosoft.com'],
    //       tgt: 'https://c209.oknosoft.com/wb_8_doc'
    //     },
    //   ]
    // },
    crystallit: {
      test: /_21_doc/,
      dbs: [],
      clone: [
        {
          tgt: 'http://oknosoft.ecookna.ru:5984',
          src: 'https://dh5.oknosoft.ru:221',
          // tgt: 'http://cou221:5984',
          suffix: '0100',
          // all_docs: true,
          // all_dbs: true,
          skip_security: true,
          local_docs: true,
          exclude: [],
          include: ['wb_21_doc'],
          remove: []
        },
      ],
    }
  }
}