/**
 * ### Настройки обрезания-объединения
 *
 * @module config
 *
 */

module.exports = {
  start: '2022-10-10',
  life: 2400,
  security: false,
  tasks: {
    "photo->local": {
      test: /wb_22_doc_1013/,
      dbs: [],
      clear: {
        src: false,
        tgt: false,
      },
      // эти серверы будут клонированы с обрезанием, массив может быть пустым
      clone: [
        {
          src: 'https://dh5.oknosoft.ru:222',
          tgt: 'http://cou221:5984/',
        },
      ],
    },
    "local->photo": {
      test: /wb_22_doc_1013/,
      dbs: [],
      clear: {
        src: false,
        tgt: false,
      },
      // эти серверы будут клонированы с обрезанием, массив может быть пустым
      clone: [
        {
          src: 'http://cou221:5984/',
          tgt: 'https://dh5.oknosoft.ru:222',
        },
      ],
    }
  }
}