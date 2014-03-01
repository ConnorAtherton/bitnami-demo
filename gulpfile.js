var gulp = require('gulp'),
    sass = require('gulp-ruby-sass'),
    autoprefixer = require('gulp-autoprefixer'),
    minifycss = require('gulp-minify-css'),
    jshint = require('gulp-jshint'),
    stylish = require('jshint-stylish');
    uglify = require('gulp-uglify'),
    imagemin = require('gulp-imagemin'),
    rename = require('gulp-rename'),
    clean = require('gulp-clean'),
    concat = require('gulp-concat'),
    compass = require('gulp-compass'),
    mocha = require('gulp-mocha');
    notify = require('gulp-notify'),
    cache = require('gulp-cache'),
    livereload = require('gulp-livereload'),
    lr = require('tiny-lr')(),
    concat = require('gulp-concat');

var EXPRESS_PORT = 4000,
    EXPRESS_ROOT = __dirname + '/dist',
    LIVERELOAD_PORT = 35729;

var paths = {
  scripts: ['app/scripts/*.js'],
  scriptsVendor: [
                  'app/bower_components/modernizr/modernizr.js',
                  'app/bower_components/handlebars/handlebars.js',
                 ],
  images: ['app/images/*'],
  html: ['app/*.html'],
  styles: ['app/styles/*.scss']
};

var destinations = {
  scripts: 'dist/scripts',
  scriptsVendor: 'dist/scripts/vendor',
  images: 'dist/images',
  html: 'dist',
  styles: 'dist/styles'
}

var individualConcat = {
  index: ['app/scripts/main.js'],
  heman: ['app/scripts/heman.js'],
  rainfall: ['app/scripts/rain.js'],
  //vim: ['app/scripts/vim.js'],
  spotlight: ['app/scripts/spotlight.js'],
  walker: ['app/scripts/walker.js']
}

function startLivereload() {
  lr.listen(LIVERELOAD_PORT);
}

function startExpress() {
  var express = require('express');
  var app = express();
  app.use(require('connect-livereload')());
  app.use(express.static(EXPRESS_ROOT));
  app.listen(EXPRESS_PORT);
}

function notifyLivereload(event) {
  // `gulp.watch()` events provide an absolute path
  // so we need to make it relative to the server root
  var fileName = require('path').relative(EXPRESS_ROOT, event.path);
  lr.changed({
    body: {
      files: [fileName]
    }
  });
}

gulp.task('sass', function() {
  return gulp.src(paths.styles)
    .pipe(sass({ unixNewlines: true, compass: true, style: 'compressed' }))
    .pipe(autoprefixer('last 2 version'))
    .pipe(gulp.dest(destinations.styles))
    .pipe(rename({suffix: '.min'}))
    .pipe(notify({ message: 'Styles task complete' }));
});

// Minify and copy all JavaScript
gulp.task('scripts', function () {
  return gulp.src(paths.scripts)
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter(stylish))
    .pipe(uglify())
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest(destinations.scripts))
    .pipe(notify({ message: 'Scripts task complete' }));
});

// Minify and copy all JavaScript
gulp.task('scripts-vendor', function () {
  return gulp.src(paths.scriptsVendor)
    .pipe(uglify())
    .pipe(concat("vendor.js"))
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest(destinations.scriptsVendor))
    .pipe(notify({ message: 'ScriptsVendor task complete' }));
});

// Copy all static images
gulp.task('images', function () {
 return gulp.src(paths.images)
    .pipe(imagemin({optimizationLevel: 5, progressive: true, interlaced: true }))
    .pipe(gulp.dest(destinations.images));
});

// Rerun the task when a file changes
gulp.task('watch', function () {
  gulp.watch(paths.scripts, ['scripts']);
  gulp.watch(['app/styles/**/*.scss'], ['sass']);
  gulp.watch(paths.images, ['images']);
  gulp.watch(paths.html, ['copy']);
});

gulp.task('clean', function() {
  return gulp.src(['dist'], {read: false})
    .pipe(clean());
});

// Copy all static assets
gulp.task('copy', function() {
  // copy favicon
  gulp.src('app/favicon.png')
    .pipe(gulp.dest('dist/'));

  // copy html files
  gulp.src(paths.html)
    .pipe(gulp.dest(destinations.html));

  // copy hidden files e.g. htaccess
  gulp.src('app/.*')
    .pipe(gulp.dest(destinations.html));
});

gulp.task('mocha', function () {
  gulp.src('./test/*.js')
    .pipe(mocha({ reporter: 'list' }));
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['clean'], function () {
  startExpress();
  startLivereload();
  gulp.watch('app/*.html', notifyLivereload);
  gulp.start('images', 'scripts', 'scripts-vendor', 'copy', 'sass', 'watch');
});
