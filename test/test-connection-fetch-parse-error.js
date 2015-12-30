var assert = require('assert'),
    net = require('net'),
    Imap = require('../lib/Connection'),
    result;

var CRLF = '\r\n';

var RESPONSES = [
  ['* CAPABILITY IMAP4rev1 UNSELECT IDLE NAMESPACE QUOTA CHILDREN',
   'A0 OK Thats all she wrote!',
   ''
  ].join(CRLF),
  ['* CAPABILITY IMAP4rev1 UNSELECT IDLE NAMESPACE QUOTA CHILDREN UIDPLUS MOVE',
   'A1 OK authenticated (Success)',
   ''
  ].join(CRLF),
  ['* NAMESPACE (("" "/")) NIL NIL',
   'A2 OK Success',
   ''
  ].join(CRLF),
  ['* LIST (\\Noselect) "/" "/"',
   'A3 OK Success',
   ''
  ].join(CRLF),
  ['* FLAGS (\\Answered \\Flagged \\Draft \\Deleted \\Seen)',
   '* OK [PERMANENTFLAGS ()] Flags permitted.',
   '* OK [UIDVALIDITY 2] UIDs valid.',
   '* 685 EXISTS',
   '* 0 RECENT',
   '* OK [UIDNEXT 4422] Predicted next UID.',
   'A4 OK [READ-ONLY] INBOX selected. (Success)',
   ''
  ].join(CRLF),
  ['* 1 FETCH (UID 2013 FLAGS (\\Seen) INTERNALDATE "16-Dec-2015 23:19:35 +0800" ENVELOPE ("Wed, 16 Dec 2015 16:19:25 +0100 (CET)" "Subject Line" ((NIL NIL NIL NIL)) ((NIL NIL NIL NIL)) ((NIL NIL NIL NIL)) ((NIL NIL NIL NIL)) NIL NIL NIL "<message@id.with" <quote.angleBracket@and.space>"))',
   'A5 OK Success',
   ''
  ].join(CRLF),
  ['* BYE LOGOUT Requested',
   'A6 OK good day (Success)',
   ''
  ].join(CRLF)
];

var srv = net.createServer(function(sock) {
  sock.write('* OK asdf\r\n');
  var buf = '', lines;
  sock.on('data', function(data) {
    buf += data.toString('utf8');
    if (buf.indexOf(CRLF) > -1) {
      lines = buf.split(CRLF);
      buf = lines.pop();
      lines.forEach(function() {
        sock.write(RESPONSES.shift());
      });
    }
  });
});
srv.listen(0, '127.0.0.1', function() {
  var port = srv.address().port;
  var imap = new Imap({
    user: 'foo',
    password: 'bar',
    host: '127.0.0.1',
    port: port,
    keepalive: false
  });
  imap.on('ready', function() {
    imap.openBox('INBOX', true, function() {
      var f = imap.seq.fetch(1, { envelope: true });
      f.on('message', function(m) {
        m.once('attributes', function(attrs) {
          result = attrs;
        });
      });
      f.on('end', function() {
        srv.close();
        imap.end();
      });
      //this traps the error from the parser... without it exception is still unhandled
      f.on('error', function(error) {
        console.log(error);
      })
    });
  });
  imap.connect();
});

process.once('exit', function() {
  assert.deepEqual(result, {
    envelope: {
      date: new Date('Wed Dec 16 2015 09:19:25 GMT-0600 (CST)'),
      subject: 'Subject Line',
      from: [],
      sender: [],
      replyTo: [],
      to: [],
      cc: null,
      bcc: null,
      inReplyTo: null,
      messageId: '<message@id.with'
    },
    date: new Date('Wed Dec 16 2015 09:19:35 GMT-0600 (CST)'),
    flags: [ '\\Seen' ],
    uid: 2013
  });
});