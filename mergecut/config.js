/**
 * ### Настройки обрезания-объединения
 *
 * @module config
 *
 */

module.exports = {
  start: '2022-10-10',
  tasks: {
    kaleva: {
      test: /_8_doc/,
      dbs: [],
      // эти серверы будут клонированы с обрезанием, массив может быть пустым
      clone: [
        {
          src: 'http://192.168.21.207:5984',
          tgt: 'http://192.168.21.206:5984',
        },
      ],
      // данные этих баз будут объединены в tgt, массив может быть пустым
      // merge: [
      //   {
      //     exclude: ['wb_8_doc'],
      //     // можно указать список серверов
      //     src: ['https://c208.oknosoft.com'],
      //     tgt: 'https://c209.oknosoft.com/wb_8_doc'
      //   },
      // ]
    }
  }
}