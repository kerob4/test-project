"use strict";
const { src, dest, parallel, series, task } = require('gulp');

const concat = require('gulp-concat');
const rename = require('gulp-rename');
const mergeStream = require('merge-stream');
const cssnano = require('gulp-clean-css');
const uglify = require('gulp-uglify-es').default;
const del = require ('del');
const composer = require('gulp-composer');
const intercept = require('gulp-intercept');
const lineReader = require('line-reader');
const fse = require('fs-extra');

function updateAutoload() {
    return mergeStream(      
        src(['src/composer.lock', 'src/composer.json'])
            .pipe(dest('dist/public_html/core/')).on("end", function() {
            //composer install --no-ansi --no-dev --no-interaction --no-plugins --no-scripts --optimize
            composer("dump-autoload", {
                "working-dir": "dist/public_html/core/",
                "bin":          "composer",
                "no-ansi":      true,
                "self-install": false,
                "no-dev": true,
                "no-interaction": true,
                "no-plugins": true,
                "no-scripts": true,
                "optimize": true
            }).on("end", function() {
                del(['dist/public_html/core/composer.lock', 'dist/public_html/core/composer.json']);
            });
        })
    );
}

function installVendors() {
    return mergeStream(       
        src(['src/composer.lock', 'src/composer.json'])
            .pipe(dest('dist/public_html/core/')).on("end", function() {
            //composer install --no-ansi --no-dev --no-interaction --no-plugins --no-progress --no-scripts --optimize-autoloader
            composer("update", {
                "working-dir": "dist/public_html/core/",
                "bin":          "composer",
                "no-ansi":      true,
                "self-install": false,
                "no-dev": true,
                "no-interaction": true,
                "no-plugins": true,
                "no-progress": true,
                "no-scripts": true,
                "optimize-autoloader": true
            }).on("end", function() {
                del(['dist/public_html/core/composer.lock', 'dist/public_html/core/composer.json']);
            });
        })
    );
}


function config() {
    return mergeStream(
        src('src/file.php')
            .pipe(dest('dist/public_html/core/')),     
    );
}

function phpCore() {
    let tmark = Math.floor(Date.now() / 1000);
    return mergeStream(
        src('src/index.php')           
            .pipe(dest('dist/public_html/')),    
        src('src/Application/**/*.php')
            .pipe(dest('dist/public_html/core/Application/')),

        src(['src/templates/**/*'], {dot: true}).pipe(intercept(function(file){
            if(!file.isDirectory()) {
                file.contents = new Buffer.from(file.contents.toString().replace(/@@@marker/gi, tmark));
            }
            return file;
        })).pipe(dest('dist/public_html/core/templates/'))
    );    
}

function css() {
    return src(['src/assets/css/vendors/bootstrap.min.css', 'src/assets/css/vendors/lobibox.min.css'])
                .pipe(concat('components.bundle.min.css'))
                .pipe(dest('src/assets/css/')).on("end", function() {
                src('src/assets/css/*.min.css')
                    .pipe(dest('dist/public_html/assets/css/'));
            });
}

function jsBundle() {
    return mergeStream(
    src('src/assets/js/*.min.js')
        .pipe(dest('dist/public_html/assets/js'))
    );
}

function jsUglify() {
    return mergeStream(
       src(['src/assets/js/vendors/jquery.min.js', 'src/assets/js/vendors/bootstrap.min.js', 'src/assets/js/vendors/lobibox.min.js'])
            .pipe(concat('components.bundle.min.js'))
            .pipe(dest('src/assets/js')),
        src('src/assets/js/src/scripts.js')
            .pipe(concat('scripts.min.js'))
            .pipe(uglify())
            .pipe(dest('src/assets/js'))     
    );
}

function cleanDistMinimal() {
    return del([        'dist/public_html/core/Application/**/*', 'dist/public_html/core/config/**/*.php',
                        'dist/public_html/core/templates/**/*', 'dist/public_html/*.php',
                        'dist/public_html/assets/css/**/*', 'dist/public_html/assets/js/**/*']);
}

function cleanVendor() {
    return del(['dist/console/vendor/**/*', 'dist/public_html/core/vendor/**/*']);
}

function cleanJSVendor() {
    return del(['dist/public_html/assets/vendor/**/*']);
}

function copyJSVendors() {
    return src(['src/assets/vendor/**/*']).pipe(dest('dist/public_html/assets/vendor/'));
}

const build_dev = series(cleanDistMinimal, cleanJSVendor, jsUglify, phpCore, parallel(updateAutoload, css, jsBundle, copyJSVendors), config);
const build_dev_nocomposer = series(cleanDistMinimal, cleanJSVendor, jsUglify, phpCore, parallel(css, jsBundle, copyJSVendors), config);
const build_vendors = series(cleanVendor, installVendors);

exports.build = build_dev;
exports.build_nc = build_dev_nocomposer;
exports.build_vendors = build_vendors;

exports.default = build_dev_nocomposer;