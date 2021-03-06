'use strict';

/**
 * Pipemin build recipe
 * Container for fast project compilation with hooks
 * @config tasks.pipeminBuild
 * @merged asset Source assets to be used in pipemin blocks
 * @merged build Files appended to first build stage, before postBuild
 * @sequential preBuild Before pipemin, on source html files
 * @sequential postBuild On all files from different build hooks
 * @sequential postMerge After pipemin, on all files it outputs and from build hook
 * @sequential processJs Actions to perform on JS assets extracted by pipemin
 * @sequential processCss Actions to perform on CSS assets extracted by pipemin
 * @sequential processHtml Actions to perform on pipemin html output
 * @param $
 * @param config
 * @param sources
 */
module.exports = function ($, config, sources) {
    /**
     * Removes dist directory from filesystem
     *
     * @task clean:dist
     * @config tasks.pipeminCleanDist
     * @config tasks.cleanDist
     */
    function cleanDistTask(cb) {
        return $.rimraf(config.paths.pipeminDist, cb);
    }

    /**
     * Main build task
     *
     * @task build
     * @config tasks.pipeminBuild
     * @config tasks.build
     * @deps clean:dist
     */
    function buildTask() {
        var assetPipe = $.utils.mergedLazypipe($.utils.getPipes('asset'));
        var postAssetPipe = $.utils.sequentialLazypipe($.utils.getPipes('postAsset'));
        var buildPipe = $.utils.mergedLazypipe($.utils.getPipes('build'));
        var preBuildPipe = $.utils.sequentialLazypipe($.utils.getPipes('preBuild'));
        var postBuildPipe = $.utils.sequentialLazypipe($.utils.getPipes('postBuild'));
        var postMergePipe = $.utils.sequentialLazypipe($.utils.getPipes('postMerge'));
        var processHtmlPipe = $.utils.sequentialLazypipe($.utils.getPipes('processHtml'));

        var processPipe = function (prefix, concatOrder) {
            return function (stream, concat) {
                var pipes = $.utils.getPipes(prefix);
                if(concat) {
                    pipes.push([concatOrder, function() { return concat; }]);
                }
                var combined = $.utils.sequentialLazypipe(pipes);
                return stream.pipe(combined());
            }
        };

        var pipeminPipe = $.lazypipe()
            .pipe(sources.index)
            .pipe(preBuildPipe)
            .pipe($.pipemin, {
                assetsStream: assetPipe.pipe(postAssetPipe),
                js: processPipe('processJs', config.order.pipeminConcatJs),
                css: processPipe('processCss', config.order.pipeminConcatJs),
                html: processHtmlPipe
            });

        return $.utils.mergedLazypipe([pipeminPipe, buildPipe.pipe(postBuildPipe)])
            .pipe(postMergePipe)
            .pipe($.gulp.dest, config.paths.pipeminDist)
            .pipe($.size)();
    }

    /**
     * Builds and prepares package for deployment
     *
     * @task package
     * @config tasks.pipeminPackage
     * @config tasks.package
     * @deps build
     */
    function pipeminPackageTask() {
        return $.gulp.src(config.paths.pipeminDist+ '**/*')
            .pipe($.zip(config.paths.pipeminPackage))
            .pipe($.gulp.dest('.'));
    }

    $.utils.maybeTask(config.tasks.pipeminBuild, [config.tasks.pipeminCleanDist], buildTask);
    $.utils.maybeTask(config.tasks.pipeminPackage, [config.tasks.pipeminBuild], pipeminPackageTask);
    $.utils.maybeTask(config.tasks.pipeminCleanDist, cleanDistTask);

    return {
        pipes: {
            // asset pipes, goes into pipemin in asset pipe
            assetRaw: sources.assets,
            postAssetSort: [config.order.assetSort, $.utils.sortFiles],
            buildRaw: sources.build,
            // process pipes, used inside pipemin only on referenced assets
            processJsMinify: [config.order.pipeminMinify, $.lazypipe()
                .pipe(function () {
                    return $.uglify(config.pipeminBuild.uglify);
                })],

            processCssMinify: [config.order.pipeminMinify, $.lazypipe()
                .pipe(function () {
                    return $.csso(config.pipeminBuild.csso);
                })],

            processHtmlMinify: [config.order.pipeminMinify, $.lazypipe()
                .pipe(function () {
                    return $.minifyHtml(config.pipeminBuild.htmlMinify);
                })]
        }
    };
};

