/**
 * ### Настройки обрезания-объединения
 *
 * @module config
 *
 */

module.exports = {
  start: '2022-10-10',
  tasks: {
    "photo->local": {
      test: /_22_doc/,
      dbs: [],
      clear: {
        src: false,
        tgt: false,
      },
      // эти серверы будут клонированы с обрезанием, массив может быть пустым
      clone: [
        {
          src: 'https://dh5.oknosoft.ru:222',
          tgt: 'http://start-l.phototech.ru:5984',
        },
      ],
    },
    "local->photo": {
      test: /_22_doc/,
      dbs: [],
      clear: {
        src: false,
        tgt: false,
      },
      // эти серверы будут клонированы с обрезанием, массив может быть пустым
      clone: [
        {
          src: 'http://start-l.phototech.ru:5984',
          tgt: 'https://dh5.oknosoft.ru:222',
        },
      ],
    }
  }
}