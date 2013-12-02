// browser only tests
if (typeof window != 'undefined') {
  require('./datachannel-manual');
  require('./datachannel-auto');
}