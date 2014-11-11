module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),
		jsdoc: {
			dist: {
				src: ["mediaqueue.js"],
				options: {
					destination: 'doc'
				}
			}
		},
		watch: {
			scripts: {
				files: ["mediaqueue.js"],
				tasks: ["jsdoc"],
				options: {
					spawn: false
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-jsdoc');
	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.registerTask('default', ['jsdoc']);
};