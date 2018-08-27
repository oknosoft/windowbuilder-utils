/**
 * Отправляет почту
 *
 * @module mailer
 *
 * Created by Evgeniy Malyarov on 20.08.2018.
 */

const nodemailer = require('nodemailer');

const {MAILUSER, MAILPWD, MAILTO, MAILCC} = process.env;

// create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: MAILUSER || 'support@oknosoft.ru',
    pass: MAILPWD || 'xxx'
  }
});

// setup email data with unicode symbols
const mailOptions = {
  from: MAILUSER || 'support@oknosoft.ru',  // sender address
  to: MAILTO || 'info@oknosoft.ru',         // list of receivers
  cc: MAILCC,                               // list of receivers
  subject: 'monitoring',                    // Subject line
  text: 'Hello world?',                     // plain text body
  html: '<b>Hello world?</b>'               // html body
};

module.exports = function sendMail({text, html, status}) {
  const options = Object.assign({}, mailOptions, {text, html});
  if(status) {
    options.subject += `: ${status}`;
  }
  return transporter.sendMail(options);
}

