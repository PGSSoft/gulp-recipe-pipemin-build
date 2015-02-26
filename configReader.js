var paths = {};

module.exports = function ($, config) {
    return $.lodash.merge({
        // defaults
        sources: {
            rawAssets: []
        },
        order: {
            pipeminMinify: 100
        },
        tasks: {
            pipeminBuild: 'build',
            pipeminCleanDist: 'clean:dist',
            pipeminPackage: 'package'
        },
        paths: {
            pipeminDist: 'dist/',
            pipeminPackage: 'package.zip'
        },
        revReplaceExtensions: ['.js', '.css', '.html', '.json']
    }, {
        // config names fallback to generics
        order: {
            pipeminMinify: config.order.minify
        },
        tasks: {
            pipeminBuild: config.tasks.build,
            pipeminCleanDist: config.tasks.cleanDist,
            pipeminPackage: config.tasks.package
        },
        paths: {
            pipeminDist: config.paths.dist,
            pipeminPackage: config.paths.package
        },
        revReplaceExtensions: config.revReplaceExtensions
        // specific config
    }, config);
};