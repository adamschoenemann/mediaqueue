/**
 * @file Contains all the source code for the MediaQueue
 * @author Adam Schønemann
 */

/**
 * An object describing a video object
 * @typedef {Object} Media
 * @property {string} url
 */

var MediaQueue = (function($) {

	var mediaId = "mq-media-";

	/**
	 * MediaQueue constructor
	 * @name MediaQueue
	 * @constructor
	 * @param {Media} media    An array of Media objects (see doc for description)
	 * @param {jQuery} container A jQuery element to contain the media queue
	 * @param {object} options   An array of option objects
	 */
	function MediaQueue(media, container, options) {

		var defaults = {
			media: {
				baseUrl: "",
				progressThreshold: 0.7,
				durationThreshold: 5,
				attrs: {},
				handlers: {}
			},
			video: {
				attrs: {
					width: "1280",
					height: "720",
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
		this.media = media.map(this._processMedia.bind(this));
		this.container = container;
	}

	MediaQueue.prototype._processMedia = function(media) {

		var self = this;
		function process(m, defaults) {
			if(typeof m === "undefined") return m;
			m = $.extend(true, {}, self.options.media, m);
			m = $.extend(true, {}, defaults, m);

			m.getSeconds = function() {
				hms = this.duration.split(":");
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

		media.getSeconds = function() {
			return Math.max(
				media.video ? media.video.getSeconds() : 0,
				media.audio ? media.audio.getSeconds() : 0
			);
		}

		return media;
	}

	/**
	 * Inserts a hidden media element and starts buffering
	 * @method prepare
	 * @memberOf MediaQueue#
	 * @param {uint} index The index of the media
	 * @returns {jQuery} The inserted element
	 */
	MediaQueue.prototype.prepare = function(index) {
		var elem = this.insertMedia(index);
		elem.addClass("hidden");
		return elem;
	}

	/**
	 * Insert a hidden media element at time (in seconds)
	 * @method prepareAt
	 * @memberOf MediaQueue#
	 * @param  {uint} time The time offset into the queue that you wish to prepare
	 */
	MediaQueue.prototype.prepareAt = function(time) {
		this.prepare(this.getAtSeconds(time).index);
	}

	/**
	 * Insert media at index
	 * @method insertMedia
	 * @memberOf MediaQueue#
	 * @param  {uint} index The media index
	 * @return {jQuery} the jQuery element
	 */
	MediaQueue.prototype.insertMedia = function(index) {
		var container = this.container;
		var elem;
		if(container.children("#" + mediaId + index).length > 0){
			elem = (container.children("#" + mediaId + index).eq(0)); // already inserted
			elem.children().children("source").each(function(_, source) {
				source = $(source);
				if(source.attr("src") == false && source.attr("data-src"))
					source.attr("src", source.attr("data-src"));
			});
		}

		if(!elem) {
			elem = this._createMediaElem(index);
			elem.trigger("willmount");
			container.append(elem);
			elem.trigger("didmount");
		}

		return elem;
	}

	/**
	 * Play the media at index
	 * @memberOf MediaQueue#
	 * @method play
	 * @param  {uint} index The media index
	 * @return {jQuery}       The jQuery element associated with the medai
	 */
	MediaQueue.prototype.play = function(index) {
		if(index >= this.media.length)
			index = this.media.length - 1;

		this.stopAll(index);
		this.container.children().addClass("hidden");
		elem = this.insertMedia(index);
		elem.removeClass("hidden");
		this.container.append(elem);
		elem.children().each(function(index, child){
			child.play();
		});

		return elem;
	}

	/**
	 * Stop all media and force them to stop buffering
	 * @memberOf MediaQueue#
	 * @method stopAll
	 * @param  {uint} except A single index that you do NOT wish to stop
	 */
	MediaQueue.prototype.stopAll = function(except) {
		this.container.children().not("#"+mediaId+except).children().each(function(_,child) {
			// In order to stop the download, we have to remove a bunch of stuff and what not
			// We move the src attribute to data-src in order to restore it later, if needed
			child.pause();
			child.src=""
			child.removeAttribute("src");
			$(child).children("source").each(function(_,source) {
				source = $(source);
				if(source.attr("src")) {
					source.attr("data-src", source.attr("src"));
					source.attr("src", "");
				}
			});
		});
	}

	/**
	 * Pause all media
	 * @method pauseAll
	 * @memberOf MediaQueue#
	 */
	MediaQueue.prototype.pauseAll = function() {
		this.container.children().children().each(function(_,child) {
			child.pause();
		});
	}

	MediaQueue.prototype._setupProgressEvent = function(elem, media) {
		var self = this;
		elem.on("progress", function(evt) {
			if (this.duration - this.currentTime > media.durationThreshold) // minimum time remaining before preload can start
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

	MediaQueue.prototype._createElem = function(index, media, type) {
		var elem = $("<" + type + ">");
		elem.attr(media.attrs);
		elem.append(media.extensions.map(function(ext){
			return $("<source>").attr("src", media.baseUrl + media.url + "." + ext).attr("type", type + "/" + ext);
		}));

		var events = Object.keys(media.handlers).join(" ");
		var self = this;
		elem.on(events, function(evt) {
			evt.data = $.extend({}, evt.data,{
				queue: self,
				index: index,
				media: media
			});
			media.handlers[evt.type](evt);
		});
		this._setupProgressEvent(elem, media);
		elem.trigger("created");

		return elem;
	}

	MediaQueue.prototype._createMediaElem = function(index) {
		var media = this.media[index];
		mediaElem = $("<div>").addClass("media-elem")
							  .attr("id", mediaId + index);
		if(media.video)
			mediaElem.append(this._createVideoElem(index, media.video));
		if(media.audio)
			mediaElem.append(this._createAudioElem(index, media.audio));
		return mediaElem;
	}

	MediaQueue.prototype._createAudioElem = function(index, audio) {
		return this._createElem(index, audio, "audio");
	}

	MediaQueue.prototype._createVideoElem = function(index, video) {
		return this._createElem(index, video, "video");
	}

	// ================================================================== //
	// ======================= time/duration functions ================== //
	// ================================================================== //

	/**
	 * Seek time into the media queue
	 * @method seek
	 * @memberOf MediaQueue#
	 * @param  {uint} time The time to seek to (in seconds)
	 * @return {boolean}      True if time offset was within the bounds of the queue, false otherwise
	 */
	MediaQueue.prototype.seek = function(time) {
		if (time > this.getTotalDuration() || time < 0)
			return false;
		var index = this.getAtSeconds(time).index
		var elem = this.play(index);
		var mediaStart = this.sumDurations(0, index - 1);
		var offset = time - mediaStart;
		elem.children("video,audio").each(function(_, child){
			if(child.readyState > 3)
				child.currentTime = offset;
			else
				$(child).on("loadedmetadata", function(evt){
					child.currentTime = offset;
				});
		});
		return true;
	}

	/**
	 * Get the total duration of the queue
	 * @method getTotalDuration
	 * @memberOf MediaQueue#
	 * @return {uint} The total duration in seconds
	 */
	MediaQueue.prototype.getTotalDuration = function() {
		return this.sumDurations(0, this.media.length - 1);
	}

	/**
	 * Get the meda at seconds in the queue
	 * @method getAtSeconds
	 * @memberOf MediaQueue#
	 * @param  {uint} seconds The offset into the queue
	 * @return {objet}         An object with keys "media" and "index"
	 */
	MediaQueue.prototype.getAtSeconds = function(seconds) {
		if(seconds < 0 || seconds > this.getTotalDuration())
			return null;
		var counter = 0;
		var media, i;
		for (i = 0; i < this.media.length; i++) {
			media = this.media[i];
			var mediaSeconds = media.getSeconds();
			if(counter + mediaSeconds > seconds) break;
			counter += media.getSeconds();
		};
		return {media: media, index: i};
	};


	/**
	 * Returns the sum of all video durations from index to (including) index
	 * @method sumDurations
	 * @memberOf MediaQueue#
	 * @param  {uint}  from
	 * @param  {uint}  to (inclusive)
	 * @return {uint}  sum of all durations in seconds
	 */
	MediaQueue.prototype.sumDurations = function(from, to) {
		var sum = 0;
		for (var i = from; i <= to; i++) {
			sum += this.media[i].getSeconds();
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