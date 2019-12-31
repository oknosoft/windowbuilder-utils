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
      // эти серверы будут клонированы с обрезанием, массив может быть пустым
      clone: [
        {
          src: 'https://dh21.oknosoft.ru:208',
          tgt: 'https://dh21.oknosoft.ru:209',
        },
      ],
      // данные этих баз будут объединены в tgt, массив может быть пустым
      merge: [
        {
          test: /_8_doc/,
          exclude: ['wb_8_doc'],
          // можно указать список серверов
          src: ['https://c208.oknosoft.com'],
          tgt: 'https://c209.oknosoft.com/wb_8_doc'
        },
      ]
    },
    // eco: {
    //   clone: [
    //     {
    //       src: 'https://c208.oknosoft.com',
    //       tgt: 'https://c209.oknosoft.com',
    //     },
    //   ],
    // }
  }
}