/**
 * ### Настройки обрезания-объединения
 *
 * @module config
 *
 */

module.exports = {
  start: '2024-10-16',
  life: 0,	//2400
  security: true,
  tasks: {
    root: {
      test: /wb_21_doc/,
      dbs: [],
      clear: {
        src: false,
        tgt: false,
      },
      // эти серверы будут клонированы с обрезанием, массив может быть пустым
      clone: [
        {
          src: 'http://192.168.21.21:5984',
          tgt: 'http://localhost:5984',
        },
      ],
      exclude: ['wb_21_log'],
    },
  }
}