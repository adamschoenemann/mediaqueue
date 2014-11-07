<!DOCTYPE html>
<html>
<head>
	<title>Er vi på?</title>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
	<script src="//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js" type="text/javascript"></script>
	<script src="fill_resize.js" type="text/javascript"></script>
	<script src="mediaqueue.js" type="text/javascript"></script>
	<style type="text/css">
		body {
			background-color: black;
		}

		* {
			margin: 0px;
			padding: 0px;
		}

/*		video {
			width: 100%;
			height: 100%;
		}
*/		.hidden {
			/*visibility: hidden;*/
			display: none;
		}
	</style>
</head>
<body>
	<div id="mq-container"></div>



	<script type="text/javascript">

		function getOffsetSeconds() {
			var now = new Date();
			var startHour = 17;
			var endHour = 21;
			var nowHour = now.getHours();
			var offsetHours = nowHour - startHour;
			return (offsetHours * 60 * 60) + now.getMinutes() * 60 + now.getSeconds();
		}

		var offsetSeconds = getOffsetSeconds();

	 	console.log(offsetSeconds);

 		var media = [
 			{
 				video: {
 					url: "flimmer",
 					duration: "00:10",
 					extensions: ["mp4", "webm", "ogv"],
 					attrs: {
 						// "loop": "true"
 					}
 				},
 				audio: {
 					url: "audio/noise_1",
 					extensions: ["mp3"]
 				}
 			},
			{
				video: {
					url: "videoer/koncerter/osram/OSRAM-intro",
					duration: "01:10",
					extensions: ["mp4", "ogv"],
					handlers: {
						ended: function(evt) {
							queue.seekTo(offsetSeconds);
						},
						buffered: function(evt) {
							queue.prepareAtOffset(offsetSeconds);
						}
					}

				}
			},
			{
				video: {
					url: "videoer/koncerter/osram/osram_01",
					duration: "30:00",
					extensions: ["mp4", "ogv"]
				}
			},
			{
				video: {
					url: "videoer/koncerter/osram/osram_02",
					duration: "30:00",
					extensions: ["mp4", "ogv"]
				}
			},
			{
				video: {
					url: "videoer/koncerter/osram/osram_03",
					duration: "30:00",
					extensions: ["mp4", "ogv"]
				}
			},
			{
				video: {
					url: "videoer/koncerter/osram/osram_04",
					duration: "30:00",
					extensions: ["mp4", "ogv"]
				}
			},
			{
				video: {
					url: "videoer/koncerter/osram/osram_05",
					duration: "30:00",
					extensions: ["mp4", "ogv"]
				}
			},
			{
				video: {
					url: "videoer/koncerter/osram/osram_06",
					duration: "30:00",
					extensions: ["mp4", "ogv"]
				}
			},
			{
				video: {
					url: "videoer/koncerter/osram/osram_07",
					duration: "30:00",
					extensions: ["mp4", "ogv"]
				}
			},
			{
				video: {
					url: "videoer/koncerter/osram/osram_08",
					duration: "20:39",
					extensions: ["mp4", "ogv"]
				}
			},
			{
				video: {
					url: "flimmer",
					duration: "00:30",
					loop: true,
					extensions: ["mp4", "webm", "ogv"]
				},
				audio :{
					url: "audio/noise_2",
					extensions: ["mp3"]
				}
			},
		];

		(function($){
			$(document).ready(function(){

				var queue = new MediaQueue(media, $("#mq-container"), {
					media: {
						baseUrl: "http://showbisse.dk/"
					}
				});

				window.queue = queue;
				queue.start(0);
			});


		// var videos = [
		// 	new VideoDescriptor("videoer/koncerter/osram/OSRAM-intro", "01:10"),
		// 	new VideoDescriptor("videoer/koncerter/osram/osram_01", "30:00"),
		// 	new VideoDescriptor("videoer/koncerter/osram/osram_02", "30:00"),
		// 	new VideoDescriptor("videoer/koncerter/osram/osram_03", "30:00"),
		// 	new VideoDescriptor("videoer/koncerter/osram/osram_04", "30:00"),
		// 	new VideoDescriptor("videoer/koncerter/osram/osram_05", "30:00"),
		// 	new VideoDescriptor("videoer/koncerter/osram/osram_06", "30:00"),
		// 	new VideoDescriptor("videoer/koncerter/osram/osram_07", "30:00"),
		// 	new VideoDescriptor("videoer/koncerter/osram/osram_08", "20:39")
		// ];

		// var queue = new VideoQueue(videos, $("#vq-container"), {
		// 	onVideoCreated: function(elem, index, queue) {
		// 		elem.on('contextmenu',function() { return false; });
		// 		elem.on("playing", function(evt) {
		// 			window.setTimeout(function(){
		// 				jQuery(window).trigger("resize");
		// 			}, 20);
		// 		});
		// 	}
		// });

		// (function($){
		// 	function onReady(evt) {
		// 		jQuery(window).trigger("resize");
		// 		$('video, audio').bind('contextmenu',function() { return false; }); // prevent right-click menu
		// 		$("#noise_1")[0].play();
		// 		queue.insertVideo(0);
		// 		queue.jumpToOnEnd(0, offsetSeconds);
		// 		window.setTimeout(function(){
		// 			$("#flimmer").remove();
		// 			$("#noise_1")[0].pause();
		// 			queue.showVideo(0);
		// 		}, 5000);
		// 	}

		// 	jQuery(document).ready(onReady);
		})(jQuery);



	</script>
</body>
</html>
