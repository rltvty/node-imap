var assert = require('assert'),
    net = require('net'),
    Imap = require('../lib/Connection'),
    crypto = require('crypto');

var CRLF = '\r\n';

// generate data larger than highWaterMark
var body1mime = crypto.pseudoRandomBytes(38).toString('hex');
var body2 = crypto.pseudoRandomBytes(118).toString('hex').substr(0, 235);
var body2mime = crypto.pseudoRandomBytes(38).toString('hex').substr(0, 75);

var RESPONSES = [
    ['* CAPABILITY IMAP4rev1 UNSELECT NAMESPACE QUOTA CHILDREN',
        'A0 OK Thats all she wrote!',
        ''
    ].join(CRLF),
    ['* CAPABILITY IMAP4rev1 UNSELECT NAMESPACE QUOTA CHILDREN UIDPLUS MOVE',
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
    '* 1 FETCH (FLAGS (\\Flagged \\Seen $NotJunk) UID 6 INTERNALDATE "06-Jul-2015 14:18:53 +0000" BODY[1] "Test!" BODY[1.MIME] {76}'
    + CRLF
    + body1mime
    + CRLF
    + '* 1 FETCH (FLAGS (\\Flagged \\Seen $NotJunk) UID 6 INTERNALDATE "06-Jul-2015 14:18:53 +0000"  BODY[2] {235}'
    + CRLF
    + body2
    + CRLF
    + '* 1 FETCH (FLAGS (\\Flagged \\Seen $NotJunk) UID 6 INTERNALDATE "06-Jul-2015 14:18:53 +0000"   BODY[2.MIME] {75}'
    + CRLF
    + body2mime
    + CRLF
    + 'A5 OK UID FETCH completed'
    + CRLF
    + ''
    ,
    ['* BYE LOGOUT Requested',
        'A6 OK good day (Success)',
        ''
    ].join(CRLF)
];

var srv = net.createServer(function (sock) {
    sock.write('* OK asdf\r\n');
    var buf = '', lines;
    sock.on('data', function (data) {
        buf += data.toString('utf8');
        if (buf.indexOf(CRLF) > -1) {
            lines = buf.split(CRLF);
            buf = lines.pop();
            lines.forEach(function () {
                sock.write(RESPONSES.shift());
            });
        }
    });
});

var message1Ended = false;
var bodyData = {};
var result = null;

srv.listen(0, '127.0.0.1', function () {
    var port = srv.address().port;
    var imap = new Imap({
        user: 'foo',
        password: 'bar',
        host: '127.0.0.1',
        port: port,
        keepalive: false
    });
    imap.on('ready', function () {
        imap.openBox('INBOX', true, function () {
            var f = imap.fetch(6, {
                bodies: ['1', '1.MIME', '2', '2.MIME'],
                struct: true
            });
            f.on('message', function (msg, seqno) {
                var prefix = '(#' + seqno + ') ';
                msg.on('body', function (stream, info) {
                    var buffer = '';
                    stream.on('data', function (chunk) {
                        buffer += chunk.toString('utf8');
                    });
                    stream.once('end', function () {
                        bodyData[info.which] = buffer;
                    });
                });
                msg.once('attributes', function (attrs) {
                    result = attrs;
                });
                msg.once('end', function () {
                    message1Ended = true;
                });
            });
            f.on('end', function () {
                srv.close();
                imap.end();
            });
        });
    });
    imap.connect();
});

process.once('exit', function () {
    assert.deepEqual(message1Ended, true);
    assert.deepEqual(result, {
        uid: 6,
        date: new Date('06-Jul-2015 14:18:53 +0000'),
        flags: ['\\Flagged', '\\Seen', '$NotJunk']
    });
    assert.deepEqual(bodyData, {
        '1': "Test!",
        '1.MIME': body1mime,
        '2': body2,
        '2.MIME': body2mime
    });
});