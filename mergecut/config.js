/**
 * ### Настройки обрезания-объединения
 *
 * @module config
 *
 */

module.exports = {
  start: '2020-03-01',
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
    tmk: {
      test: /_21_/,
      dbs: [],
      clone: [
        {
          src: 'http://192.168.21.221:5984',
          tgt: 'http://192.168.21.5:5984',
          //suffix: '0100',
          //all_docs: true,
          all_dbs: true,
          // skip_security: true,
          skip_docs: true,
          //local_docs: true,
          exclude: [],
          include: [],
          remove: []
        },
      ],
    }
  }
}