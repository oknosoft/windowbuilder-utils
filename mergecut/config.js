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
        // {
        //   src: 'http://192.168.21.208:5984',
        //   tgt: 'http://192.168.21.109:5984',
        // },
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
    crystallit: {
      test: /_25_doc/,
      dbs: [],
      clone: [
        {
          src: 'https://crystallit.oknosoft.ru/couchdb',
          tgt: 'https://crystallit.oknosoft.ru/c2020',
          // tgt: 'http://cou221:5984',
          // suffix: '2019',
          // all_docs: true,
          // all_dbs: true,
          local_docs: true,
          exclude: [],
          include: [],
          remove: []
        },
      ],
    }
  }
}