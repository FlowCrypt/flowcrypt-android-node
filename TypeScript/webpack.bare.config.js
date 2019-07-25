
module.exports = {
  target: 'web',
  mode: 'none',
  entry: {
    'entrypoint-bare': './build/ts/flowcrypt-mobile-core/TypeScript/source/entrypoint-bare.js',
    'bare-asn1': './node_modules/asn1.js/lib/asn1.js',
  },
  output: {
    path: __dirname + '/build/bundles/raw',
    filename: '[name].js',
    libraryTarget: 'commonjs2'
  },
}
