import appdmg from 'appdmg';
import through from 'through2';
import gutil from 'gulp-util';

const PluginError = gutil.PluginError;
const PLUGIN_NAME = 'gulp-appdmg';

export default function(options) {
  const stream = through.obj(function(file, encoding, next) {
    next();
  }, function(callback) {
    const self = this;
    const ee = appdmg(options);

    ee.on('progress', function(info) {
      gutil.log(info.current + '/' + info.total + ' ' + info.type + ' ' + (info.title || info.status));
    });

    ee.on('error', function(err) {
      self.emit('error', new PluginError(PLUGIN_NAME, err));
      callback();
    });

    ee.on('finish', callback);
  });

  // returning the file stream
  stream.resume();
  return stream;
};
