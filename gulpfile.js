/*jslint node: true*/
'use strict';

var gulp        = require('gulp');
var browserify  = require('gulp-browserify');
var rename      = require('gulp-rename');
var del         = require('del');
var ts          = require('gulp-typescript');
var merge       = require('merge2');

var paths = {
    outputDir: './public',
    outputFile: 'soundWorks.js',
	htmlSrc: './src/**/*.html',
    main: './tmp/js/index.js',
    src: './src/SoundWorks',
    systemjs: './node_modules/systemjs/dist/*.js',
    typescript: './node_modules/typescript/lib/typescript.js'
};

gulp.task('clean', function (cb) {
    del([paths.outputDir, 'tmp'], cb);
});

gulp.task('copy:deps', function(){
    return gulp.src([paths.systemjs, paths.typescript])
        .pipe(gulp.dest(paths.outputDir));
});

gulp.task('copy:html', function(){
    return gulp.src(paths.htmlSrc)
        .pipe(gulp.dest(paths.outputDir));
});

gulp.task('copy', ['copy:deps', 'copy:html']);

gulp.task('browserify', ['ts'], function () {
    return gulp.src(paths.main)
        .pipe(browserify({
            insertGlobals: false,
            debug: true
        }))
        .pipe(rename(paths.outputFile))
        .pipe(gulp.dest(paths.outputDir));
});

gulp.task('watch', function () {
    gulp.watch(paths.src + '/**/*.ts', ['browserify']);
	gulp.watch(paths.htmlSrc, ['copy']);
});

gulp.task('ts', function() {
    var tsResult = gulp.src('src/SoundWorks/**/*.ts')
        .pipe(ts({
            declarationFiles: true,
            noExternalResolve: false,
            target: 'ES6',
            noImplicitAny: true,
            module: 'commonjs'
        }));
    var tsSource = gulp.src('src/SoundWorks/**/*.ts');

    return merge([
        tsSource.pipe(gulp.dest('public/SoundWorks')),
        tsResult.dts.pipe(gulp.dest('public/js/SoundWorks/def')),
        tsResult.js.pipe(gulp.dest('public/js/SoundWorks'))
    ]);
});

gulp.task('release', ['ts','copy'], function(cb){
    del(['tmp'], cb);
});

gulp.task('dev', ['watch', 'copy']);

gulp.task('default', ['release']);

gulp.task('polyfill', [], function(){
    return gulp.src('./src/Polyfill/main.js')
        .pipe(browserify({
            insertGlobals: true,
            debug: true
        }))
        .pipe(rename('audio-polyfill.js'))
        .pipe(gulp.dest(paths.outputDir));
});
