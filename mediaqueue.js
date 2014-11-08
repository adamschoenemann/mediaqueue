// TODO:
// Implement seekTo()
// Implement short-circuiting videso, e.g. skipping to next after 5 seconds

var MediaQueue = (function($) {

	var mediaId = "mq-media-";

	function MediaQueue(media, container, options) {
		// var defaults = {
		// 	progressThreshold: 0.8,
		// 	durationThreshold: 60,
		// 	onMediaCreated: null,
		// 	onMediaEnded: function(elem, index, queue) {
		// 		queue.showVideo(index + 1).elem[0].play();
		// 	},
		// 	onMediaBuffered: function(elem, index, queue) {
		// 		queue.insertVideo(index + 1);
		// 	}
		// };

		var defaults = {
			media: {
				baseUrl: "",
				progressThreshold: 0.7,
				durationThreshold: 60,
				attrs: {},
				handlers: {}
			},
			video: {
				attrs: {
					width: "1280",
					height: "720",
					// autoplay: "",
					preload: "auto",
					autobuffer: ""
				},
				handlers: {
					ended: function(evt) {
						evt.data.queue.play(evt.data.index + 1);
					},
					play: function(evt) {
						console.log("playing");
					},
					buffered: function(evt) {
						console.log("buffered");
						evt.data.queue.prepare(evt.data.index + 1);
					}
				}
			},
			audio: {
			}
		}
		this.options = $.extend(true, {}, defaults, options);
		this.media = media.map(this.processMedia.bind(this));
		this.container = container;
	}

	MediaQueue.prototype.processMedia = function(media) {

		var self = this;
		function process(m, defaults) {
			if(typeof m === "undefined") return m;
			$.extend(true, m, self.options.media);
			$.extend(true, m, defaults);

			m.toSeconds = function() {
				hms = m.duration.split(":");
				if (hms.length <= 0) return 0;

				var seconds = 0;
				for (var i = 0; i < hms.length; i++) {
					seconds += (i === hms.length - 1) ?
									parseInt(hms[i]) :
									(parseInt(hms[i]) * 60 * (hms.length - 1 - i))

				};
				return seconds;
			};

			return m;
		}

		media.video = process(media.video, this.options.video);
		media.audio = process(media.audio, this.options.audio);

		return media;
	}

	MediaQueue.prototype.prepare = function(index) {
		var elem = this.insertMedia(index);
		elem.addClass("hidden");
		return elem;
	}

	MediaQueue.prototype.insertMedia = function(index) {
		var container = this.container;
		if(container.children("#" + mediaId + index).length > 0)
			return (container.children("#" + mediaId + index).eq(0)); // already inserted

		var elem = this.createMediaElem(index);
		container.append(elem);

		return elem;
	}

	MediaQueue.prototype.play = function(index) {
		if(index >= this.media.length)
			index = this.media.length - 1;

		this.container.children().addClass("hidden");
		elem = this.insertMedia(index);
		elem.removeClass("hidden");
		this.pauseAll();
		this.container.append(elem);
		elem.children().each(function(index, child){
			child.play();
		});
	}

	MediaQueue.prototype.pauseAll = function(index) {
		this.container.children().children().each(function(_,child) {
			child.pause();
		});
	}

	MediaQueue.prototype.setupProgressEvent = function(elem, media) {
		var self = this;
		elem.on("progress", function(evt) {
			if (this.duration - this.currentTime > media.durationThreshold)
				return;
			var progress = this.getHighestProgress();
			// console.log(progress, media.progressThreshold);
			// console.log(this.readyState);
			if (this.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA
				&& progress < media.progressThreshold)
				return;
			// console.log(index + " | " + progress + " | buffered: " + this.buffered.length);

			$(this).off("progress", arguments.callee);
			$(this).trigger("buffered");

			// console.log(index +
			// 	" loaded above threshold of " + self.options.progressThreshold);

		});
	}

	MediaQueue.prototype.createElem = function(index, media, type) {
		var elem = $("<" + type + ">");
		elem.attr(media.attrs);
		elem.append(media.extensions.map(function(ext){
			return $("<source>").attr("src", media.baseUrl + media.url + "." + ext).attr("type", type + "/" + ext);
		}))

		var events = Object.keys(media.handlers).join(" ");
		var self = this;
		elem.on(events, function(evt) {
			evt.data = {
				queue: self,
				index: index,
				media: media
			};
			media.handlers[evt.type](evt);
		});
		this.setupProgressEvent(elem, media);

		return elem;
	}

	MediaQueue.prototype.createMediaElem = function(index) {
		var media = this.media[index];
		mediaElem = $("<div>").addClass("media-elem")
							  .attr("id", mediaId + index);
		if(media.video)
			mediaElem.append(this.createVideoElem(index, media.video));
		if(media.audio)
			mediaElem.append(this.createAudioElem(index, media.audio));
		return mediaElem;
	}

	MediaQueue.prototype.createAudioElem = function(index, audio) {
		return this.createElem(index, audio, "audio");
	}

	MediaQueue.prototype.createVideoElem = function(index, video) {
		return this.createElem(index, video, "video");
	}

	// ================================================================== //
	// ----------------------- time/duration functions ------------------ //
	// ================================================================== //


	/**
	 * Returns the sum of all video durations from index to (exluding) index
	 * @param  {uint}  from
	 * @param  {uint}  to (Non-inclusive)
	 * @return {uint}  sum of all durations in seconds
	 */
	MediaQueue.prototype.sumDurations = function(from, to) {
		var sum = 0;
		for (var i = from; i < to; i++) {
			sum += this.videoDescriptors[i].getSeconds();
		};
		return sum;
	}

	return MediaQueue;

})(jQuery);


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