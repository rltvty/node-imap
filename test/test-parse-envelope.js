var parseEnvelope = require('../lib/Parser').parseEnvelope;

var assert = require('assert'),
    inspect = require('util').inspect;

[
  { source: '"Wed, 16 Dec 2015 16:19:25 +0100 (CET)" "Subject Line" ((NIL NIL NIL NIL)) ((NIL NIL NIL NIL)) ((NIL NIL NIL NIL)) ((NIL NIL NIL NIL)) NIL NIL NIL "<message@id.with" <quote.angleBracket@and.space>"',
    expected: [
      'Wed, 16 Dec 2015 16:19:25 +0100 (CET)', //date
      'Subject Line', //subject
      [[null, null, null, null]], //from
      [[null, null, null, null]], //sender
      [[null, null, null, null]], //replyto
      [[null, null, null, null]], //to
      null, //cc
      null, //bcc
      null, //in-reply-to
      '<message@id.with" <quote.angleBracket@and.space>' // messageId
    ],
    what: 'messageId with space and un-escaped quotes'
  },
  { source: '"Thu, 17 Dec 2015 16:08:55 +0800 (CST)" "Subject Line" ((NIL NIL NIL NIL)) ((NIL NIL NIL NIL)) ((NIL NIL NIL NIL)) ((NIL NIL NIL NIL)) NIL NIL NIL "<message.id.with@[brackets]>"',
    expected: [
      'Thu, 17 Dec 2015 16:08:55 +0800 (CST)', //date
      'Subject Line', //subject
      [[null, null, null, null]], //from
      [[null, null, null, null]], //sender
      [[null, null, null, null]], //replyto
      [[null, null, null, null]], //to
      null, //cc
      null, //bcc
      null, //in-reply-to
      '<message.id.with@[brackets]>' // messageId
    ],
    what: 'messageId with square brackets'
  },
  { source: '"Sat, 28 Mar 2015 17:31:04 +0100" "Subject" ((NIL NIL "support" "test.com")) ((NIL NIL "support" "test.com")) ((NIL NIL "support" "test.com")) ((NIL NIL "to" "test.com")) NIL NIL NIL "<message.id@with(parentheses)>"',
    expected: [
      'Sat, 28 Mar 2015 17:31:04 +0100', //date
      'Subject', //subject
      [[null, null, 'support', 'test.com']], //from
      [[null, null, 'support', 'test.com']], //sender
      [[null, null, 'support', 'test.com']], //replyto
      [[null, null, 'to', 'test.com']], //to
      null, //cc
      null, //bcc
      null, //in-reply-to
      '<message.id@with(parentheses)>' // messageId
    ],
    what: 'messageId with parentheses'
  },
  {
    source: '"Wed, 30 Mar 2014 02:38:23 +0100" "Some Subject Line \\"D:\\\\\\"?=" (("Test Account (Rltvty L)" NIL "account" "test.com")) (("Test Account (Rltvty L)" NIL "account" "test.com")) ((NIL NIL "account" "test.com")) ((NIL NIL "one.two" "test.fr") (NIL NIL "two.three" "test.fr")) NIL NIL NIL "<message@test.eu>"',
    expected: [
      'Wed, 30 Mar 2014 02:38:23 +0100',
      'Some Subject Line "D:\\"?=',
      [['Test Account (Rltvty L)', null, 'account', 'test.com']],
      [['Test Account (Rltvty L)', null, 'account', 'test.com']],
      [[null, null, 'account', 'test.com']],
      [[null, null, 'one.two', 'test.fr'], [null, null, 'two.three', 'test.fr']],
      null,
      null,
      null,
      '<message@test.eu>'
    ],
    what: 'Subject with triple backslash'
  }
].forEach(function(v) {
  var result;

  try {
    result = parseEnvelope(v.source);
  } catch (e) {
    console.log(makeMsg(v.what, 'JS Exception: ' + e.stack));
    return;
  }

  assert.deepEqual(result,
                   v.expected,
                   makeMsg(v.what,
                           'Result mismatch:'
                           + '\nParsed: ' + inspect(result, false, 10)
                           + '\nExpected: ' + inspect(v.expected, false, 10)
                   )
                  );
});

function makeMsg(what, msg) {
  return '[' + what + ']: ' + msg;
}