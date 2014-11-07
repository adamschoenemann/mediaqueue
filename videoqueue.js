
// TODO:
// 	Comment
// 	Test all functionality (especially IE)
// 	Decide whether to try to "clean up" old video elements
// 	Clean up API (rename and make members private)
// 	Set up to use intro 'flimmer'
// 	Set up to seek to correct time
//  Make sure auto-sizing actually works (blergh)
var VideoDescriptor = (function($) {
	function VideoDescriptor(filename, duration) {
		this.filename = filename;
		this.duration = duration;
	}
	VideoDescriptor.prototype.getSeconds = function() {
		var ms = this.duration.split(":");
		var mins = parseInt(ms[0]), secs = parseInt(ms[1]);
		return mins * 60 + secs;
	}
	return VideoDescriptor;
})(jQuery);

/**
 * VideoQueue closure
 * @param  {jQuery} $
 * @return {VideoQueue constructor}
 */
var VideoQueue = (function($) {

	/**
	 * VideoQueue constructor
	 * @param {Array[Video]} videos
	 * @param {jQuery object} container
	 * @param {Object} options
	 */
	function VideoQueue(videos, container, options) {
		this.videoDescriptors = videos;
		this.container = container;
		var defaults = {
			progressThreshold: 0.8,
			durationThreshold: 60,
			onVideoCreated: null,
			onVideoEnded: function(elem, index, queue) {
				queue.showVideo(index + 1).elem[0].play();
			},
			onVideoBuffered: function(elem, index, queue) {
				queue.insertVideo(index + 1);
			}
		};
		this.options = $.extend({}, defaults, options);
	};

	/**
	 * Creates a video element from index in this.videoDecriptors array
	 * @param  {uint} index
	 * @return {jQuery object}
	 */
	VideoQueue.prototype.createVideoElem = function(index) {
		var vid = this.videoDescriptors[index];
		var t = template;
		t = t.replace(new RegExp("\{\{filename\}\}", 'g'), videos[index].filename)
		     .replace(new RegExp("\{\{index\}\}", 'g'), index);
		var elem = $(t);
		if (index < this.videoDescriptors.length - 1) { // if not last
			var self = this;
			elem.on("progress", function(evt) {
				if (this.duration - this.currentTime > self.options.durationThreshold)
					return;
				var progress = this.getHighestProgress();
				if (this.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA
					&& progress < self.options.progressThreshold)
						return;
				// console.log(index + " | " + progress + " | buffered: " + this.buffered.length);

 				$(this).off("progress", arguments.callee);
 				$(this).trigger("buffered");

				console.log(index +
					" loaded above threshold of " + self.options.progressThreshold);

			});
			if (typeof this.options.onVideoEnded == "function") {
				elem.on("ended", function(evt) {
					self.options.onVideoEnded(elem, index, self);
				});
			}

			if (typeof self.options.onVideoBuffered == "function") {
				elem.on("buffered", function() {
					self.options.onVideoBuffered(elem, index, self);
				});
			}

			if (typeof this.options.onVideoCreated == "function") {
				this.options.onVideoCreated(elem, index, this);
			}
		}
		console.log("Created element with index " + index);
		return elem;
	};


	/**
	 * Returns whether video at index is inserted into the DOM
	 * @param  {uint}  index
	 * @return {Boolean}
	 */
	VideoQueue.prototype.isVideoInserted = function(index) {
		return (this.container.children("#vq-video-" + index).length == 1);
	}

	/**
	 * Inserts at video into the DOM at proper location
	 * @param  {uint}  index
	 * @return {Object}  with keys: {uint} inserted, {jQuery object} elem
	 */
	VideoQueue.prototype.insertVideo = function(index) {
		var container = this.container;
		if (container.children().length == 0) {
			var vid = this.createVideoElem(index);
			container.append(vid);
			return {inserted: 1, elem: vid};
		}
		var videoElem = container.children("#vq-video-" + index);
		if (videoElem.length > 0) // video already exists
			return {inserted: 0, elem: videoElem};
		// find previous
		var prev = container.children("#vq-video-" + (index-1));
		if (prev.length == 1) {
			var vid = this.createVideoElem(index);
			prev.after(vid);
			return {inserted: 1, elem: vid};
		}
		// no previous found, try finding next
		var next = container.children("#vq-video-" + (index+1));
		if (next.length == 1) {
			var vid = this.createVideoElem(index);
			next.before(vid);
			return {inserted: 1, elem: vid};
		}
		// find nearest
		var children = container.children();
		var nearest = children.eq(0);
		for (var i = 1; i < children.length; i++) {
			var childOrder = this.getIndex(children.eq(i));
			if (Math.abs(index - childOrder) < Math.abs(index - this.getIndex(nearest))) {
				nearest = children.eq(i);
			}
		};

		var nearestOrder = this.getIndex(nearest);
		if (nearestOrder < index) {
			var vid = this.createVideoElem(index);
			nearest.after(vid);
			return {inserted: 1, elem: vid};
		} else if (nearestOrder > index) {
			var vid = this.createVideoElem(index);
			nearest.before(vid);
			return {inserted: 1, elem: vid};
		} else {
			throw "Invalid ordering found in video container!";
		}
	};


	VideoQueue.prototype.getIndex = function(elem) {
		var id = elem.attr('id');
		return parseInt(id.replace('vq-video-', ''));
	};

	VideoQueue.prototype.jumpToOnCurrentEnd = function(seconds) {
		var current = this.container.children().not(".hidden");
		if(current.length <= 0) throw "No current video could be found";
		if(current.length != 1) throw "More than one video is visible";
		this.jumpToOnEnd(this.getIndex(current), seconds);
	};

	VideoQueue.prototype.jumpToOnEnd = function(index, seconds) {
		var elem = this.getElemByIndex(index);
		var self = this;
		elem.off("buffered");
		elem.on("buffered", function(evt) {
			self.preload(seconds);
		});
		elem.off("ended");
		elem.on("ended", function(evt) {
			self.searchTo(seconds);
		});

	}

	/**
	 * Returns the sum of all video durations from index to (exluding) index
	 * @param  {uint}  from
	 * @param  {uint}  to (Non-inclusive)
	 * @return {uint}  sum of all durations in seconds
	 */
	VideoQueue.prototype.sumDurations = function(from, to) {
		var sum = 0;
		for (var i = from; i < to; i++) {
			sum += this.videoDescriptors[i].getSeconds();
		};
		return sum;
	}

	VideoQueue.prototype.preload = function(seconds) {
		var info = this.getAtSeconds(seconds);
		var vidStartTime = this.sumDurations(0, info.index);
		var seekSeconds = seconds - vidStartTime;
		var insertions = this.insertVideo(info.index);
		var video = insertions.elem;
		if (video[0].readyState >= HTMLMediaElement.HAVE_METADATA)
			video[0].currentTime = seekSeconds;
		else
			video.on("loadedmetadata", function(evt) {
				this.currentTime = seekSeconds;
			});
	}

	VideoQueue.prototype.searchTo = function(seconds) {
		var info = this.getAtSeconds(seconds);
		var vidStartTime = this.sumDurations(0, info.index);
		var seekSeconds = seconds - vidStartTime;
		var insertions = this.showVideo(info.index);
		var video = insertions.elem;
		if (video[0].readyState >= HTMLMediaElement.HAVE_METADATA) {
			video[0].currentTime = seekSeconds;
			video[0].play();
		}
		else
			video.on("loadedmetadata", function(evt) {
				this.currentTime = seekSeconds;
				this.play();
			});

	};


	VideoQueue.prototype.showVideo = function(index) {
		var insertions = this.insertVideo(index);
		var elem = insertions.elem;
		this.container.children().addClass("hidden");
		elem.removeClass("hidden");
		return insertions;
	};


	VideoQueue.prototype.getAtSeconds = function(seconds) {
		if(seconds < 0 || seconds > this.getTotalDuration())
			return null;
		var counter = 0;
		var vidDesc, i;
		for (i = 0; i < this.videoDescriptors.length; i++) {
			vidDesc = this.videoDescriptors[i];
			var vidSeconds = vidDesc.getSeconds();
			if(counter + vidSeconds > seconds) break;
			counter += vidDesc.getSeconds();
		};
		return {videoDescriptor: vidDesc, index: i};
	};



	VideoQueue.prototype.getVideoDescriptorAtSeconds = function(seconds) {
		var tmp = this.getAtSeconds(seconds);
		return tmp.videoDescriptor;
	};


	VideoQueue.prototype.getElemByIndex = function(index) {
		return this.container.children("#vq-video-" + index);
	};


	VideoQueue.prototype.getIndexAtSeconds = function(seconds) {
		var tmp = this.getAtSeconds(seconds);
		return tmp.index;
	};

	/**
	 * Returns duration of all videos in seconds
	 * @return {int}
	 */
	VideoQueue.prototype.getTotalDuration = function() {
		var dur = 0;
		for (var i = 0; i < this.videoDescriptors.length; i++) {
			var vid = this.videoDescriptors[i];
			dur += vid.getSeconds();
		};
		return dur;
	};

	/**
	 * The video template
	 * @type {String}
	 */
	var template = '\
		<video width="1280" height="720" autoplay preload="auto" autobuffer class="fill hidden vq-video" id="vq-video-{{index}}">\
			<source src="{{filename}}.mp4" type="video/mp4" />\
			<source src="{{filename}}.webm" type="video/webm" />\
			<source src="{{filename}}.ogv" type="video/ogg" />\
			<p> Your browser does not support the video tag.</p>\
		</video>';

	return VideoQueue;

})(jQuery);


// Utilities
HTMLMediaElement.prototype.getHighestProgress = function() {
	if(typeof this.buffered == 'undefined' || this.buffered.length < 1)
		return 0;

	var progress = 0;
	for (var i = 0; i < this.buffered.length; i++) {
		var b = this.buffered.end(i);
		var p = b / this.duration;
		if (p > progress)
			progress = p;
	};
	return progress;
}
