module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		test: {
			files: [
				//"tests/core/*.js",
				"tests/core/weekday-after.js"
				//"tests/africa/*.js",
				//"tests/*/*.js"
				//"tests/europe/*.js"
				//"tests/america/los_angeles.js"
				//"tests/pacific/chatham.js"
			]
		},
		lint: {
			files: [
				'moment-timezone.js',
				'tests/**/*.js'
			]
		},
		watch: {
			files: '<config:lint.files>',
			tasks: 'default'
		}
	});

	// Default task.
	grunt.registerTask('default', 'test');

	grunt.loadTasks("tasks");
};
